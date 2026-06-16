/**
 * Singleton module managing the Bluesky Jetstream WebSocket + RSS polling.
 * Runs sentiment analysis on each incoming post and notifies subscribers.
 * Meant to run server-side in a single Next.js process (npm run start).
 */

import { analyzeSentiment } from "./sentiment";
import type { LiveSignal, LiveAggregate } from "./live-types";
import { classifyTopic } from "./live-types";
import { RSS_FEEDS } from "./rss-feeds";
import type { Emotion, Sentiment, SentimentScores } from "./types";

// ---------- State ----------

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const signals: LiveSignal[] = [];
let totalSignals = 0;

type Listener = (event: string, data: unknown) => void;
const listeners = new Set<Listener>();

// ---------- Public API ----------

export function subscribe(listener: Listener) {
  listeners.add(listener);
  ensureRunning();
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
    };
  }

  const avgScores: SentimentScores = { positive: 0, negative: 0, neutral: 0 };
  let avgIntensity = 0;
  const phraseCounts = new Map<string, number>();

  for (const s of windowSignals) {
    avgScores.positive += s.scores.positive;
    avgScores.negative += s.scores.negative;
    avgScores.neutral += s.scores.neutral;
    avgIntensity += s.intensity;
  }
  avgScores.positive /= volume;
  avgScores.negative /= volume;
  avgScores.neutral /= volume;
  avgIntensity /= volume;

  // Dominant
  let dominant: Sentiment = "neutral";
  if (avgScores.positive >= avgScores.negative && avgScores.positive >= avgScores.neutral) dominant = "positive";
  else if (avgScores.negative >= avgScores.positive && avgScores.negative >= avgScores.neutral) dominant = "negative";

  // Top phrases from recent signals (use text words)
  for (const s of windowSignals.slice(-30)) {
    const words = s.text.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    for (const w of words.slice(0, 5)) {
      phraseCounts.set(w, (phraseCounts.get(w) || 0) + 1);
    }
  }
  const topPhrases = [...phraseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);

  // Synthetic emotion averages based on dominant
  const emotions: Emotion[] = buildEmotions(avgScores);

  return { window, scores: avgScores, dominant, intensity: avgIntensity, volume, emotions, topPhrases };
}

function buildEmotions(scores: SentimentScores): Emotion[] {
  return [
    { label: "Joy", value: scores.positive * 0.9 },
    { label: "Trust", value: scores.positive * 0.6 + scores.neutral * 0.3 },
    { label: "Anticipation", value: (scores.positive + scores.neutral) * 0.4 },
    { label: "Anger", value: scores.negative * 0.7 },
    { label: "Fear", value: scores.negative * 0.5 + scores.neutral * 0.2 },
    { label: "Sadness", value: scores.negative * 0.8 },
    { label: "Surprise", value: Math.max(scores.positive, scores.negative) * 0.5 },
  ];
}

// ---------- Bluesky Jetstream ----------

const JETSTREAM_URL =
  "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post";

function ensureRunning() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  connectJetstream();
  startRssPolling();
  startAggregateInterval();
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
        processText(msg.commit.record.text, "bluesky");
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
  rssInterval = setInterval(pollRss, 120_000); // every 2 min
}

async function pollRss() {
  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "AmorphSentiment-Batcave/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      // Simple extraction: get <title> and <description> from items
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
        processText(text, "rss");
      }
    } catch {
      /* skip failed feeds */
    }
  }
}

// ---------- Process & Store ----------

function processText(text: string, source: "bluesky" | "rss") {
  if (!text || text.length < 5) return;

  const trimmed = text.slice(0, 300);
  const result = analyzeSentiment(trimmed);

  const signal: LiveSignal = {
    id: `${source}-${totalSignals}-${Date.now()}`,
    text: trimmed,
    source,
    dominant: result.dominant,
    scores: result.scores,
    intensity: result.intensity,
    timestamp: Date.now(),
    topic: classifyTopic(trimmed),
  };

  signals.push(signal);
  totalSignals++;

  // Cap buffer at 2000
  if (signals.length > 2000) signals.splice(0, signals.length - 2000);

  broadcast("signal", signal);
}

// ---------- Periodic aggregate push ----------

let aggInterval: ReturnType<typeof setInterval> | null = null;

function startAggregateInterval() {
  if (aggInterval) return;
  aggInterval = setInterval(() => {
    if (listeners.size === 0) return;
    broadcast("aggregate", getAggregates());
    broadcast("heartbeat", { ts: Date.now(), totalSignals });
  }, 5000); // push aggregates every 5s
}
