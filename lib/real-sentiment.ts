import { analyzeOne } from "./groq";
import type { SentimentResult, Sentiment, KeyPhrase } from "./types";

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function round(n: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function buildSummary(
  dominant: Sentiment,
  scores: { positive: number; negative: number; neutral: number },
  query: string,
  emotions: { label: string; value: number }[],
  entities: { name: string; type: string }[],
  topics: string[],
): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const topic = query.length > 48 ? `${query.slice(0, 48)}…` : query || "this topic";

  const sentimentLine =
    dominant === "positive"
      ? `The overall tone is positive (${pct(scores.positive)}), with energy around ${pct(scores.positive + scores.negative * 0.3)}.`
      : dominant === "negative"
        ? `The overall tone is negative (${pct(scores.negative)}), with tension at ${pct(scores.negative + scores.positive * 0.2)}.`
        : `The overall tone is neutral (${pct(scores.neutral)}), with balanced engagement.`;

  const emotionLine = emotions.length
    ? ` Top emotions: ${emotions.slice(0, 3).map((e) => `${e.label} (${pct(e.value)})`).join(", ")}.`
    : "";

  const entityLine = entities.length
    ? ` Key entities include ${entities.slice(0, 3).map((e) => e.name).join(", ")}.`
    : "";

  const topicLine = topics.length ? ` Topics: ${topics.slice(0, 3).join(", ")}.` : "";

  return `Analysis of "${topic}". ${sentimentLine}${emotionLine}${entityLine}${topicLine}`;
}

/**
 * Analyze text using the local Ollama LLM and return a full SentimentResult.
 */
export async function analyzeSentimentReal(query: string): Promise<SentimentResult> {
  const trimmed = query.trim();
  const seedSource = trimmed.length ? trimmed : "neutral seed";
  const id = `res_${hashString(seedSource).toString(36)}_${Date.now().toString(36)}`;

  const result = await analyzeOne(trimmed);

  const polarity = round(result.scores.positive - result.scores.negative);

  const keyPhrases: KeyPhrase[] = result.key_phrases.map((text, i) => ({
    text,
    sentiment: result.sentiment,
    weight: round(Math.max(0.3, 1 - i * 0.15)),
  }));

  return {
    id,
    query: trimmed || "(empty)",
    scores: {
      positive: round(result.scores.positive),
      negative: round(result.scores.negative),
      neutral: round(result.scores.neutral),
    },
    dominant: result.sentiment,
    polarity,
    intensity: round(result.intensity),
    emotions: result.emotions,
    keyPhrases,
    summary: buildSummary(
      result.sentiment,
      result.scores,
      trimmed,
      result.emotions,
      result.entities,
      result.topics,
    ),
    sampleSize: 1,
    createdAt: Date.now(),
  };
}
