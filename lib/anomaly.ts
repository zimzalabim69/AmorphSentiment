/**
 * Statistical Anomaly Detection Engine
 * Detects sentiment shifts, volume spikes, and cross-source divergence
 * in real-time as signals flow through the system.
 */

import { randomUUID } from "crypto";
import type { LiveSignal, SignalSource } from "./live-types";
import { insertAnomaly, type AnomalyRecord } from "./db";

// Rolling window buffers
const SENTIMENT_BUFFER_SIZE = 50;
const sentimentBuffers = new Map<string, number[]>(); // topic -> scores
const volumeWindows = new Map<string, { count: number; lastReset: number }>();
const lastSentiment = new Map<string, number>(); // topic -> polarity
const lastVolume = new Map<string, number>();

const MIN_SIGNALS_FOR_DETECTION = 10;

function getPolarity(s: LiveSignal): number {
  return s.scores.positive - s.scores.negative;
}

/**
 * Analyze a batch of signals for anomalies.
 * Call after every flush from the sentiment worker.
 */
export function detectAnomalies(signals: LiveSignal[]): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const now = Date.now();

  // Group signals by topic
  const byTopic = new Map<string, LiveSignal[]>();
  const bySource = new Map<SignalSource, LiveSignal[]>();

  for (const s of signals) {
    // Group by topic
    for (const t of s.topics) {
      const list = byTopic.get(t) ?? [];
      list.push(s);
      byTopic.set(t, list);
    }
    // Group by source for divergence
    const srcList = bySource.get(s.source) ?? [];
    srcList.push(s);
    bySource.set(s.source, srcList);
  }

  // 1. Sentiment shift detection per topic
  for (const [topic, topicSignals] of byTopic) {
    if (topicSignals.length < 3) continue;

    const polarities = topicSignals.map(getPolarity);
    const avgPolarity = polarities.reduce((a, b) => a + b, 0) / polarities.length;

    // Update rolling buffer
    const buf = sentimentBuffers.get(topic) ?? [];
    buf.push(avgPolarity);
    if (buf.length > SENTIMENT_BUFFER_SIZE) buf.shift();
    sentimentBuffers.set(topic, buf);

    if (buf.length < MIN_SIGNALS_FOR_DETECTION) continue;

    const prevAvg = buf.slice(0, -polarities.length).reduce((a, b) => a + b, 0) / Math.max(1, buf.length - polarities.length);
    const shift = Math.abs(avgPolarity - prevAvg);

    if (shift > 0.4) {
      const oldVal = lastSentiment.get(topic);
      lastSentiment.set(topic, avgPolarity);

      const severity: AnomalyRecord["severity"] = shift > 0.7 ? "critical" : shift > 0.5 ? "high" : "medium";
      const direction = avgPolarity > (oldVal ?? 0) ? "↑" : "↓";
      const anomaly: AnomalyRecord = {
        id: randomUUID(),
        type: "sentiment_shift",
        target: topic,
        description: `"${topic}" sentiment ${direction} ${Math.round(shift * 100)}pts`,
        severity,
        oldValue: oldVal,
        newValue: avgPolarity,
        timestamp: now,
      };
      insertAnomaly(anomaly);
      anomalies.push(anomaly);
    }
  }

  // 2. Volume spike detection
  for (const [topic, topicSignals] of byTopic) {
    const win = volumeWindows.get(topic) ?? { count: 0, lastReset: now };

    // Reset every 10 minutes
    if (now - win.lastReset > 10 * 60 * 1000) {
      win.count = 0;
      win.lastReset = now;
    }
    win.count += topicSignals.length;
    volumeWindows.set(topic, win);

    const prevVol = lastVolume.get(topic) ?? win.count;
    const ratio = prevVol > 0 ? win.count / prevVol : 1;

    if (ratio > 3 && win.count >= 5) {
      lastVolume.set(topic, win.count);
      const anomaly: AnomalyRecord = {
        id: randomUUID(),
        type: "volume_spike",
        target: topic,
        description: `"${topic}" mentions spiked ${Math.round(ratio)}x`,
        severity: ratio > 5 ? "critical" : ratio > 4 ? "high" : "medium",
        oldValue: prevVol,
        newValue: win.count,
        timestamp: now,
      };
      insertAnomaly(anomaly);
      anomalies.push(anomaly);
    }
  }

  // 3. Cross-source divergence
  if (bySource.size >= 2) {
    const sourcePolarities = new Map<SignalSource, number>();
    for (const [src, srcSignals] of bySource) {
      if (srcSignals.length < 2) continue;
      sourcePolarities.set(src, srcSignals.map(getPolarity).reduce((a, b) => a + b, 0) / srcSignals.length);
    }

    const sources = [...sourcePolarities.entries()];
    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const [srcA, polA] = sources[i];
        const [srcB, polB] = sources[j];
        const gap = Math.abs(polA - polB);
        if (gap > 0.5) {
          const labelA = srcA === "bluesky" ? "BSky" : srcA === "hackernews" ? "HN" : srcA === "reddit" ? "Reddit" : srcA === "rss" ? "RSS" : srcA === "newsapi" ? "News" : srcA;
          const labelB = srcB === "bluesky" ? "BSky" : srcB === "hackernews" ? "HN" : srcB === "reddit" ? "Reddit" : srcB === "rss" ? "RSS" : srcB === "newsapi" ? "News" : srcB;
          const anomaly: AnomalyRecord = {
            id: randomUUID(),
            type: "divergence",
            target: `${labelA} vs ${labelB}`,
            description: `${labelA} (${Math.round(polA * 100)}) vs ${labelB} (${Math.round(polB * 100)}) disagree`,
            severity: gap > 0.8 ? "high" : "medium",
            oldValue: polA,
            newValue: polB,
            timestamp: now,
          };
          insertAnomaly(anomaly);
          anomalies.push(anomaly);
        }
      }
    }
  }

  return anomalies;
}
