export type Sentiment = "positive" | "negative" | "neutral";

export interface SentimentScores {
  positive: number;
  negative: number;
  neutral: number;
}

export interface Emotion {
  label: string;
  /** 0..1 intensity */
  value: number;
}

export interface KeyPhrase {
  text: string;
  sentiment: Sentiment;
  /** 0..1 relevance weight */
  weight: number;
}

export interface SentimentResult {
  id: string;
  query: string;
  scores: SentimentScores;
  dominant: Sentiment;
  /** -1 (very negative) .. 1 (very positive) */
  polarity: number;
  /** 0..1 how strong / energetic the reaction is */
  intensity: number;
  emotions: Emotion[];
  keyPhrases: KeyPhrase[];
  summary: string;
  sampleSize: number;
  createdAt: number;
}

export interface PresetTopic {
  id: string;
  label: string;
  prompt: string;
  /** small accent color used in the UI */
  accent: string;
}
