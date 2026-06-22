/**
 * SQLite persistence layer for AmorphSentiment.
 * Stores every signal, entity history, topic trends, synthesis reports, and anomalies.
 * Enables historical analysis, trend detection, and entity timelines.
 */

import Database from "better-sqlite3";
import type { LiveSignal, SignalSource } from "./live-types";
// SQLite persistence layer

const DB_PATH = process.env.AMORPH_DB_PATH ?? "./amorph.db";
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema();
  }
  return db;
}

function initSchema() {
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      source TEXT NOT NULL,
      dominant TEXT NOT NULL,
      positive REAL NOT NULL,
      negative REAL NOT NULL,
      neutral REAL NOT NULL,
      intensity REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      topic TEXT,
      topics TEXT,
      entities TEXT,
      emotions TEXT,
      key_phrases TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);
    CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source);
    CREATE INDEX IF NOT EXISTS idx_signals_topic ON signals(topic);

    CREATE TABLE IF NOT EXISTS entity_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      source TEXT NOT NULL,
      dominant TEXT NOT NULL,
      positive REAL NOT NULL,
      negative REAL NOT NULL,
      neutral REAL NOT NULL,
      intensity REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      context TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_entity_name ON entity_history(entity_name);
    CREATE INDEX IF NOT EXISTS idx_entity_timestamp ON entity_history(timestamp);

    CREATE TABLE IF NOT EXISTS topic_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      volume INTEGER NOT NULL,
      avg_intensity REAL NOT NULL,
      avg_positive REAL NOT NULL,
      avg_negative REAL NOT NULL,
      avg_neutral REAL NOT NULL,
      window_start INTEGER NOT NULL,
      window_end INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_topic_trends_topic ON topic_trends(topic);
    CREATE INDEX IF NOT EXISTS idx_topic_trends_time ON topic_trends(window_end);

    CREATE TABLE IF NOT EXISTS synthesis_reports (
      id TEXT PRIMARY KEY,
      headline TEXT NOT NULL,
      summary TEXT NOT NULL,
      dominant_sentiment TEXT NOT NULL,
      intensity REAL NOT NULL,
      topics TEXT NOT NULL,
      anomalies TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_time ON synthesis_reports(timestamp);

    CREATE TABLE IF NOT EXISTS anomalies (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      target TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      old_value REAL,
      new_value REAL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_anomalies_time ON anomalies(timestamp);
    CREATE INDEX IF NOT EXISTS idx_anomalies_target ON anomalies(target);
  `);
}

// ---------- Signals ----------

export function insertSignal(signal: LiveSignal) {
  const d = getDb();
  d.prepare(`
    INSERT OR IGNORE INTO signals
    (id, text, source, dominant, positive, negative, neutral, intensity, timestamp, topic, topics, entities, emotions, key_phrases)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    signal.id,
    signal.text,
    signal.source,
    signal.dominant,
    signal.scores.positive,
    signal.scores.negative,
    signal.scores.neutral,
    signal.intensity,
    signal.timestamp,
    signal.topic ?? null,
    JSON.stringify(signal.topics),
    JSON.stringify(signal.entities),
    JSON.stringify(signal.emotions),
    JSON.stringify(signal.keyPhrases)
  );

  // Also insert entity history rows for timeline queries
  const entStmt = d.prepare(`
    INSERT INTO entity_history
    (entity_name, entity_type, source, dominant, positive, negative, neutral, intensity, timestamp, context)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const e of signal.entities) {
    entStmt.run(
      e.name,
      e.type,
      signal.source,
      signal.dominant,
      signal.scores.positive,
      signal.scores.negative,
      signal.scores.neutral,
      signal.intensity,
      signal.timestamp,
      signal.text.slice(0, 200)
    );
  }
}

export function getSignalsSince(timestamp: number, limit = 500): LiveSignal[] {
  const d = getDb();
  const rows = d.prepare(`
    SELECT * FROM signals WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?
  `).all(timestamp, limit) as RawSignal[];
  return rows.map(deserializeSignal);
}

export function getSignalCount(since: number): number {
  const d = getDb();
  const row = d.prepare(`SELECT COUNT(*) as c FROM signals WHERE timestamp >= ?`).get(since) as { c: number };
  return row.c;
}

// ---------- Entity Timeline ----------

export interface EntityTimelinePoint {
  timestamp: number;
  dominant: string;
  positive: number;
  negative: number;
  neutral: number;
  intensity: number;
  context: string;
  source: SignalSource;
}

export function getEntityTimeline(
  name: string,
  since = Date.now() - 24 * 60 * 60 * 1000
): EntityTimelinePoint[] {
  const d = getDb();
  const rows = d.prepare(`
    SELECT timestamp, dominant, positive, negative, neutral, intensity, context, source
    FROM entity_history
    WHERE entity_name = ? AND timestamp >= ?
    ORDER BY timestamp ASC
  `).all(name, since) as EntityTimelinePoint[];
  return rows;
}

export function getTopEntities(since: number, limit = 20): { name: string; type: string; mentions: number }[] {
  const d = getDb();
  return d.prepare(`
    SELECT entity_name as name, entity_type as type, COUNT(*) as mentions
    FROM entity_history
    WHERE timestamp >= ?
    GROUP BY entity_name, entity_type
    ORDER BY mentions DESC
    LIMIT ?
  `).all(since, limit) as { name: string; type: string; mentions: number }[];
}

// ---------- Topic Trends ----------

export function insertTopicTrend(
  topic: string,
  volume: number,
  avgIntensity: number,
  avgScores: { positive: number; negative: number; neutral: number },
  windowStart: number,
  windowEnd: number
) {
  const d = getDb();
  d.prepare(`
    INSERT INTO topic_trends (topic, volume, avg_intensity, avg_positive, avg_negative, avg_neutral, window_start, window_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(topic, volume, avgIntensity, avgScores.positive, avgScores.negative, avgScores.neutral, windowStart, windowEnd);
}

export function getTopicTrend(topic: string, since: number): { timestamp: number; avgIntensity: number; volume: number }[] {
  const d = getDb();
  return d.prepare(`
    SELECT window_end as timestamp, avg_intensity, volume
    FROM topic_trends
    WHERE topic = ? AND window_end >= ?
    ORDER BY window_end ASC
  `).all(topic, since) as { timestamp: number; avgIntensity: number; volume: number }[];
}

// ---------- Synthesis Reports ----------

export interface SynthesisReport {
  id: string;
  headline: string;
  summary: string;
  dominantSentiment: string;
  intensity: number;
  topics: string[];
  anomalies: string[];
  timestamp: number;
}

export function insertReport(report: SynthesisReport) {
  const d = getDb();
  d.prepare(`
    INSERT INTO synthesis_reports (id, headline, summary, dominant_sentiment, intensity, topics, anomalies, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    report.id,
    report.headline,
    report.summary,
    report.dominantSentiment,
    report.intensity,
    JSON.stringify(report.topics),
    JSON.stringify(report.anomalies),
    report.timestamp
  );
}

export function getRecentReports(limit = 10): SynthesisReport[] {
  const d = getDb();
  const rows = d.prepare(`
    SELECT * FROM synthesis_reports ORDER BY timestamp DESC LIMIT ?
  `).all(limit) as RawReport[];
  return rows.map((r) => ({
    id: r.id,
    headline: r.headline,
    summary: r.summary,
    dominantSentiment: r.dominant_sentiment,
    intensity: r.intensity,
    topics: JSON.parse(r.topics),
    anomalies: JSON.parse(r.anomalies ?? "[]"),
    timestamp: r.timestamp,
  }));
}

// ---------- Anomalies ----------

export interface AnomalyRecord {
  id: string;
  type: "sentiment_shift" | "volume_spike" | "divergence" | "entity_spike";
  target: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  oldValue?: number;
  newValue?: number;
  timestamp: number;
}

export function insertAnomaly(a: AnomalyRecord) {
  const d = getDb();
  d.prepare(`
    INSERT INTO anomalies (id, type, target, description, severity, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(a.id, a.type, a.target, a.description, a.severity, a.oldValue ?? null, a.newValue ?? null, a.timestamp);
}

export function getRecentAnomalies(since: number, limit = 50): AnomalyRecord[] {
  const d = getDb();
  const rows = d.prepare(`
    SELECT * FROM anomalies WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?
  `).all(since, limit) as RawAnomaly[];
  return rows.map((r) => ({
    id: r.id,
    type: r.type as AnomalyRecord["type"],
    target: r.target,
    description: r.description,
    severity: r.severity as AnomalyRecord["severity"],
    oldValue: r.old_value ?? undefined,
    newValue: r.new_value ?? undefined,
    timestamp: r.timestamp,
  }));
}

// ---------- Cross-source divergence ----------

export interface SourceSentiment {
  source: SignalSource;
  count: number;
  avgPositive: number;
  avgNegative: number;
  avgNeutral: number;
  avgIntensity: number;
}

export function getSourceSentimentForTopic(topic: string, since: number): SourceSentiment[] {
  const d = getDb();
  return d.prepare(`
    SELECT source,
           COUNT(*) as count,
           AVG(positive) as avgPositive,
           AVG(negative) as avgNegative,
           AVG(neutral) as avgNeutral,
           AVG(intensity) as avgIntensity
    FROM signals
    WHERE topic = ? AND timestamp >= ?
    GROUP BY source
    ORDER BY count DESC
  `).all(topic, since) as SourceSentiment[];
}

// ---------- Raw types ----------

interface RawSignal {
  id: string;
  text: string;
  source: string;
  dominant: string;
  positive: number;
  negative: number;
  neutral: number;
  intensity: number;
  timestamp: number;
  topic: string | null;
  topics: string;
  entities: string;
  emotions: string;
  key_phrases: string;
}

interface RawReport {
  id: string;
  headline: string;
  summary: string;
  dominant_sentiment: string;
  intensity: number;
  topics: string;
  anomalies: string | null;
  timestamp: number;
}

interface RawAnomaly {
  id: string;
  type: string;
  target: string;
  description: string;
  severity: string;
  old_value: number | null;
  new_value: number | null;
  timestamp: number;
}

function deserializeSignal(row: RawSignal): LiveSignal {
  return {
    id: row.id,
    text: row.text,
    source: row.source as SignalSource,
    dominant: row.dominant as "positive" | "negative" | "neutral",
    scores: { positive: row.positive, negative: row.negative, neutral: row.neutral },
    intensity: row.intensity,
    timestamp: row.timestamp,
    topic: row.topic,
    topics: JSON.parse(row.topics),
    entities: JSON.parse(row.entities),
    emotions: JSON.parse(row.emotions),
    keyPhrases: JSON.parse(row.key_phrases),
  };
}
