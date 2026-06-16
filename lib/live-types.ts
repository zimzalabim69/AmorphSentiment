import type { Sentiment, SentimentScores, Emotion } from "./types";

/** A single analyzed signal from Bluesky or RSS */
export interface LiveSignal {
  id: string;
  text: string;
  source: "bluesky" | "rss";
  dominant: Sentiment;
  scores: SentimentScores;
  intensity: number;
  timestamp: number;
  topic: string | null;
}

/** Aggregate stats over a rolling window */
export interface LiveAggregate {
  window: "30s" | "2min" | "10min";
  scores: SentimentScores;
  dominant: Sentiment;
  intensity: number;
  volume: number;
  emotions: Emotion[];
  topPhrases: string[];
}

/** SSE event payload */
export type StreamEvent =
  | { type: "signal"; data: LiveSignal }
  | { type: "aggregate"; data: LiveAggregate[] }
  | { type: "heartbeat"; data: { ts: number; totalSignals: number } };

/** Topic filter categories */
export const TOPIC_FILTERS = [
  "all",
  "tech",
  "geopolitics",
  "markets",
  "science",
  "memes",
  "sports",
  "culture",
] as const;

export type TopicFilter = (typeof TOPIC_FILTERS)[number];

/** Keywords per topic for classification */
export const TOPIC_KEYWORDS: Record<Exclude<TopicFilter, "all">, string[]> = {
  tech: ["ai", "software", "code", "app", "startup", "google", "apple", "microsoft", "openai", "gpu", "chip", "algorithm", "developer", "api", "cloud", "data", "cyber", "hack", "robot", "linux"],
  geopolitics: ["war", "peace", "nato", "election", "president", "congress", "senate", "sanctions", "diplomacy", "treaty", "tariff", "border", "refugee", "military", "china", "russia", "ukraine", "iran", "israel", "eu"],
  markets: ["stock", "crypto", "bitcoin", "market", "trade", "fed", "inflation", "gdp", "earnings", "ipo", "nasdaq", "dow", "sp500", "gold", "oil", "rate", "recession", "bull", "bear", "hedge"],
  science: ["research", "study", "nasa", "space", "climate", "vaccine", "physics", "biology", "genome", "quantum", "mars", "telescope", "fossil", "experiment", "lab", "cell", "molecule", "asteroid"],
  memes: ["lol", "lmao", "bruh", "ratio", "based", "cope", "slay", "vibe", "sigma", "sus", "rizz", "npc", "cringe", "fire", "goat", "ong", "deadass", "fr", "bussin", "cap"],
  sports: ["game", "win", "score", "team", "player", "nba", "nfl", "mlb", "soccer", "goal", "champion", "finals", "match", "season", "coach", "draft", "mvp", "record", "stadium", "tournament"],
  culture: ["movie", "music", "album", "art", "film", "book", "concert", "festival", "fashion", "anime", "series", "show", "celebrity", "viral", "trend", "review", "stream", "tiktok", "youtube", "netflix"],
};

/** Classify text into a topic (first match wins, null = no match) */
export function classifyTopic(text: string): TopicFilter | null {
  const lower = text.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return topic as TopicFilter;
    }
  }
  return null;
}
