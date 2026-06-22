/**
 * Singleton module managing the live data pipeline:
 * Bluesky Jetstream + RSS + Reddit + Hacker News + optional NewsAPI.
 * Feeds raw posts into the Groq sentiment worker for real NLP analysis.
 * Persists everything to SQLite for historical analysis.
 * Meant to run server-side in a single Next.js process.
 */

import type { LiveSignal, LiveAggregate } from "./live-types";
import { RSS_FEEDS } from "./rss-feeds";
import { startSentimentWorker, queueText } from "./sentiment-worker";
import {
  startRedditPolling,
  startHnPolling,
  startNewsApiPolling,
  detectTrending,
} from "./sources";
import type { Emotion, Sentiment, SentimentScores } from "./types";
import { insertSignal, insertTopicTrend } from "./db";
import { detectAnomalies } from "./anomaly";
import { generateSynthesis } from "./synthesis";

// ---------- State ----------

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const signals: LiveSignal[] = [];
let totalSignals = 0;

let trendingTopics: { topic: string; volume: number; velocity: number }[] = [];

 type Listener = (event: string, data: unknown) => void;
const listeners = new Set<Listener>();
let workerStarted = false;

// ---------- Public API ----------

export async function subscribe(listener: Listener) {
  listeners.add(listener);
  await ensureRunning();
  return () => {
    listeners.delete(listener);
  };
}

export function getRecentSignals(n = 50): LiveSignal[] {
  return signals.slice(-n);
}

export function getTotalSignals(): number {
  return totalSignals;
}

export function getTrendingTopics() {
  return trendingTopics;
}

export function getAggregates(): LiveAggregate[] {
  const now = Date.now();
  return [
    computeAggregate("30s", now - 30_000),
    computeAggregate("2min", now - 120_000),
    computeAggregate("10min", now - 600_000),
  ];
}

// ---------- Broadcast ----------

function broadcast(event: string, data: unknown) {
  for (const l of listeners) {
    try {
      l(event, data);
    } catch {
      /* noop */
    }
  }
}

// ---------- Aggregation ----------

function computeAggregate(
  window: LiveAggregate["window"],
  since: number,
): LiveAggregate {
  const windowSignals = signals.filter((s) => s.timestamp >= since);
  const volume = windowSignals.length;

  if (volume === 0) {
    return {
      window,
      scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
      dominant: "neutral",
      intensity: 0,
      volume: 0,
      emotions: [],
      topPhrases: [],
      topEntities: [],
      activeTopics: [],
    };
  }

  const avgScores: SentimentScores = { positive: 0, negative: 0, neutral: 0 };
  let avgIntensity = 0;
  const phraseCounts = new Map<string, number>();
  const entityCounts = new Map<string, { name: string; type: string; mentions: number }>();
  const topicAccum: Record<string, { volume: number; intensitySum: number }> = {};
  const emotionAccum: Record<string, number> = {};

  for (const s of windowSignals) {
    avgScores.positive += s.scores.positive;
    avgScores.negative += s.scores.negative;
    avgScores.neutral += s.scores.neutral;
    avgIntensity += s.intensity;

    for (const p of s.keyPhrases.slice(0, 3)) {
      phraseCounts.set(p, (phraseCounts.get(p) || 0) + 1);
    }

    for (const e of s.entities) {
      const key = `${e.name}|${e.type}`;
      const existing = entityCounts.get(key);
      if (existing) {
        existing.mentions += 1;
      } else {
        entityCounts.set(key, { name: e.name, type: e.type, mentions: 1 });
      }
    }

    for (const t of s.topics) {
      if (!topicAccum[t]) topicAccum[t] = { volume: 0, intensitySum: 0 };
      topicAccum[t].volume += 1;
      topicAccum[t].intensitySum += s.intensity;
    }

    for (const em of s.emotions) {
      emotionAccum[em.label] = (emotionAccum[em.label] || 0) + em.value;
    }
  }

  avgScores.positive /= volume;
  avgScores.negative /= volume;
  avgScores.neutral /= volume;
  avgIntensity /= volume;

  let dominant: Sentiment = "neutral";
  if (avgScores.positive >= avgScores.negative && avgScores.positive >= avgScores.neutral) dominant = "positive";
  else if (avgScores.negative >= avgScores.positive && avgScores.negative >= avgScores.neutral) dominant = "negative";

  const topPhrases = [...phraseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);

  const topEntities = [...entityCounts.values()]
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);

  const activeTopics = Object.entries(topicAccum)
    .map(([topic, { volume: vol, intensitySum }]) => ({
      topic,
      volume: vol,
      avgIntensity: intensitySum / vol,
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8);

  const emotions: Emotion[] = Object.entries(emotionAccum)
    .map(([label, sum]) => ({ label, value: sum / volume }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  return {
    window,
    scores: avgScores,
    dominant,
    intensity: avgIntensity,
    volume,
    emotions,
    topPhrases,
    topEntities,
    activeTopics,
  };
}

// ---------- Bluesky Jetstream ----------

const JETSTREAM_URL =
  "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post";

async function ensureRunning() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  connectJetstream();
  startRssPolling();
  setTimeout(() => startRedditPolling(), 10_000);
  setTimeout(() => startHnPolling(), 20_000);
  setTimeout(() => startNewsApiPolling(), 30_000);
  startAggregateInterval();
  startSynthesisInterval();
  startTopicTrendInterval();
  await startWorkerIfNeeded();
}

async function startWorkerIfNeeded() {
  if (workerStarted) return;
  workerStarted = true;
  await startSentimentWorker((signal) => {
    signals.push(signal);
    totalSignals++;
    // Hard cap + time-based eviction (keep last 10 min)
    const cutoff = Date.now() - 600_000;
    const firstValid = signals.findIndex((s) => s.timestamp >= cutoff);
    if (firstValid > 0) {
      signals.splice(0, firstValid);
    }
    if (signals.length > 2000) signals.splice(0, signals.length - 2000);
    broadcast("signal", signal);

    // Persist to SQLite
    try { insertSignal(signal); } catch { /* skip db errors */ }

    // Anomaly detection on rolling window
    if (totalSignals % 3 === 0) {
      const recent = signals.slice(-15);
      const anomalies = detectAnomalies(recent);
      for (const a of anomalies) broadcast("anomaly", a);
    }

    // Update trending topics
    if (totalSignals % 10 === 0) {
      const recent = signals.slice(-100);
      trendingTopics = detectTrending(recent).map((t) => ({
        topic: t.topic,
        volume: t.volume,
        velocity: t.velocity,
      }));
    }
  });
}

function connectJetstream() {
  try {
    ws = new WebSocket(JETSTREAM_URL);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log("[Jetstream] connected");
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(String(event.data));
      if (msg?.commit?.record?.text) {
        queueText(msg.commit.record.text, "bluesky");
      }
    } catch {
      /* skip malformed */
    }
  };

  ws.onerror = () => {
    ws?.close();
  };

  ws.onclose = () => {
    ws = null;
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (listeners.size > 0) connectJetstream();
  }, 5000);
}

// ---------- RSS Polling ----------

let rssInterval: ReturnType<typeof setInterval> | null = null;
const seenRssIds = new Set<string>();

function startRssPolling() {
  if (rssInterval) return;
  pollRss();
  rssInterval = setInterval(pollRss, 120_000);
}

async function pollRss() {
  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Sentinel/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
      for (const item of items.slice(0, 5)) {
        const title = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
        const desc = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")?.replace(/<[^>]+>/g, "") || "";
        const id = `rss-${feed.name}-${title.slice(0, 40)}`;
        if (seenRssIds.has(id)) continue;
        seenRssIds.add(id);
        if (seenRssIds.size > 2000) {
          const first = seenRssIds.values().next().value;
          if (first) seenRssIds.delete(first);
        }
        const text = `${title} ${desc}`.slice(0, 300);
        queueText(text, "rss");
      }
    } catch {
      /* skip failed feeds */
    }
  }
}

// ---------- Periodic aggregate push ----------

let aggInterval: ReturnType<typeof setInterval> | null = null;

function startAggregateInterval() {
  if (aggInterval) return;
  aggInterval = setInterval(() => {
    if (listeners.size === 0) return;
    broadcast("aggregate", getAggregates());
    broadcast("trending", getTrendingTopics());
    broadcast("heartbeat", { ts: Date.now(), totalSignals });
  }, 5000);
}

// ---------- Synthesis Reports ----------

let synthInterval: ReturnType<typeof setInterval> | null = null;

function startSynthesisInterval() {
  if (synthInterval) return;
  // Generate first report after 30s — enough for initial signals to accumulate
  setTimeout(async () => {
    const report = await generateSynthesis(signals);
    if (report) broadcast("report", report);
  }, 30_000);

  synthInterval = setInterval(async () => {
    if (listeners.size === 0) return;
    const report = await generateSynthesis(signals);
    if (report) broadcast("report", report);
  }, 1_200_000); // every 20 min
}

// ---------- Topic Trend Persistence ----------

let trendInterval: ReturnType<typeof setInterval> | null = null;

function startTopicTrendInterval() {
  if (trendInterval) return;
  trendInterval = setInterval(() => {
    const now = Date.now();
    const agg = getAggregates();
    const topics = agg.flatMap((a) => a.activeTopics);
    for (const t of topics) {
      insertTopicTrend(t.topic, t.volume, t.avgIntensity, { positive: 0, negative: 0, neutral: 0 }, now - 60_000, now);
    }
  }, 60_000); // every 1 min
}
