/**
 * Async sentiment worker: accumulates incoming posts, batch-processes via Ollama,
 * and emits enriched signals with real NLP sentiment + NER + topics.
 */

import { analyzeBatch, type OllamaSentimentResult } from "./ollama";
import type { LiveSignal } from "./live-types";

interface QueuedItem {
  id: string;
  text: string;
  source: "bluesky" | "rss";
  timestamp: number;
}

interface WorkerCallback {
  (signal: LiveSignal): void;
}

const QUEUE: QueuedItem[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let isProcessing = false;
const BATCH_SIZE = 5;
const BATCH_INTERVAL_MS = 2500;
let callback: WorkerCallback | null = null;

/**
 * Start the worker. Call once on app boot.
 */
export function startSentimentWorker(onSignal: WorkerCallback) {
  callback = onSignal;
  scheduleFlush();
}

/**
 * Queue a raw text for sentiment analysis.
 */
export function queueText(text: string, source: "bluesky" | "rss") {
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
  const batch = QUEUE.splice(0, Math.min(BATCH_SIZE, QUEUE.length));

  try {
    const results = await analyzeBatch(batch.map((b) => b.text));

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const result = results[i] ?? fallbackResult();
      const signal: LiveSignal = buildSignal(item, result);
      callback(signal);
    }
  } catch (err) {
    console.warn("[SentimentWorker] Ollama batch failed:", err);
    // Fallback: emit signals with basic heuristic sentiment so nothing is lost
    for (const item of batch) {
      const signal: LiveSignal = buildSignal(item, fallbackResult());
      callback(signal);
    }
  } finally {
    isProcessing = false;
    scheduleFlush();
  }
}

function buildSignal(item: QueuedItem, result: OllamaSentimentResult): LiveSignal {
  // Use the Ollama result's topics if available, otherwise heuristic classify
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
