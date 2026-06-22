/**
 * Async sentiment worker: accumulates incoming posts, batch-processes via Groq cloud LLM,
 * and emits enriched signals with real NLP sentiment + NER + topics.
 */

import {
  analyzeBatch,
  checkGroqHealth as checkOllamaHealth,
  type GroqSentimentResult as OllamaSentimentResult,
} from "./groq";
import { analyzeSimple } from "./simple-sentiment";
import type { LiveSignal, SignalSource } from "./live-types";

interface QueuedItem {
  id: string;
  text: string;
  source: SignalSource;
  timestamp: number;
}

interface WorkerCallback {
  (signal: LiveSignal): void;
}

const QUEUE: QueuedItem[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let isProcessing = false;
const BATCH_SIZE = 3;
const BATCH_INTERVAL_MS = 60_000;
let callback: WorkerCallback | null = null;

export type WorkerStatus = "idle" | "processing" | "error" | "offline";
let workerStatus: WorkerStatus = "idle";
const statusListeners = new Set<(s: WorkerStatus) => void>();

export function getWorkerStatus(): WorkerStatus {
  return workerStatus;
}

export function onWorkerStatusChange(fn: (s: WorkerStatus) => void) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

function setStatus(s: WorkerStatus) {
  workerStatus = s;
  for (const l of statusListeners) try { l(s); } catch { /* noop */ }
}

/**
 * Start the worker. Call once on app boot.
 * Performs an initial health check and sets status to offline if LLM is unreachable.
 */
export async function startSentimentWorker(onSignal: WorkerCallback) {
  callback = onSignal;
  const healthy = await checkOllamaHealth();
  if (!healthy) {
    setStatus("offline");
    scheduleHealthCheckRetry();
  }
  scheduleFlush();
}

let healthRetryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleHealthCheckRetry() {
  if (healthRetryTimer) return;
  healthRetryTimer = setTimeout(async () => {
    healthRetryTimer = null;
    if (workerStatus !== "offline") return;
    const healthy = await checkOllamaHealth();
    if (healthy) {
      setStatus("idle");
    } else {
      scheduleHealthCheckRetry();
    }
  }, 10_000);
}

/**
 * Queue a raw text for sentiment analysis.
 */
export function queueText(text: string, source: SignalSource) {
  if (!text || text.length < 3) return;
  const trimmed = text.slice(0, 300);
  QUEUE.push({
    id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    source,
    timestamp: Date.now(),
  });
  // Immediate flush if queue is full
  if (QUEUE.length >= BATCH_SIZE * 2 && !isProcessing) {
    flushQueue();
  }
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    if (QUEUE.length > 0 && !isProcessing) {
      flushQueue();
    } else {
      scheduleFlush();
    }
  }, BATCH_INTERVAL_MS);
}

async function flushQueue() {
  if (isProcessing || QUEUE.length === 0 || !callback) {
    scheduleFlush();
    return;
  }

  isProcessing = true;
  setStatus("processing");
  const batch = QUEUE.splice(0, Math.min(BATCH_SIZE, QUEUE.length));

  try {
    const results = await analyzeBatch(batch.map((b) => b.text));

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const result = results[i] ?? fallbackResult();
      const signal: LiveSignal = buildSignal(item, result);
      callback(signal);
    }
    setStatus("idle");
  } catch (err) {
    console.warn("[SentimentWorker] Groq batch failed, using local fallback:", err);
    setStatus("error");
    for (const item of batch) {
      const localResult = analyzeSimple(item.text);
      const signal: LiveSignal = buildSignal(item, localResult as OllamaSentimentResult);
      callback(signal);
    }
  } finally {
    isProcessing = false;
    scheduleFlush();
  }
}

function buildSignal(item: QueuedItem, result: OllamaSentimentResult): LiveSignal {
  const topics = result.topics.length > 0 ? result.topics : [];

  return {
    id: item.id,
    text: item.text,
    source: item.source,
    dominant: result.sentiment,
    scores: result.scores,
    intensity: result.intensity,
    timestamp: item.timestamp,
    topic: topics[0] ?? null,
    topics,
    entities: result.entities,
    emotions: result.emotions,
    keyPhrases: result.key_phrases,
  };
}

function fallbackResult(): OllamaSentimentResult {
  return {
    sentiment: "neutral",
    scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
    intensity: 0.3,
    emotions: [],
    entities: [],
    key_phrases: [],
    topics: [],
  };
}
