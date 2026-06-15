import type {
  Emotion,
  KeyPhrase,
  Sentiment,
  SentimentResult,
  SentimentScores,
} from "./types";

/**
 * A fully fake, deterministic-ish sentiment "analyzer".
 *
 * It mixes a tiny lexicon with a seeded pseudo-random generator so that the
 * same input always produces the same organism, while different inputs feel
 * meaningfully different. No network, no real ML — purely for the demo.
 */

const POSITIVE_WORDS = [
  "love",
  "great",
  "amazing",
  "excellent",
  "happy",
  "joy",
  "wonderful",
  "beautiful",
  "best",
  "win",
  "winning",
  "incredible",
  "delight",
  "delightful",
  "hope",
  "hopeful",
  "exciting",
  "excited",
  "brilliant",
  "fantastic",
  "good",
  "awesome",
  "perfect",
  "thrilled",
  "celebrate",
  "celebration",
  "breakthrough",
  "stunning",
  "gorgeous",
  "thank",
  "thanks",
  "grateful",
  "calm",
  "peace",
  "smooth",
  "bloom",
  "thrive",
  "vibrant",
];

const NEGATIVE_WORDS = [
  "hate",
  "terrible",
  "awful",
  "horrible",
  "sad",
  "angry",
  "anger",
  "fear",
  "worst",
  "lose",
  "losing",
  "fail",
  "failure",
  "broken",
  "bug",
  "crash",
  "disappointing",
  "disappointed",
  "ugly",
  "pain",
  "painful",
  "toxic",
  "scary",
  "panic",
  "disaster",
  "frustrating",
  "frustrated",
  "annoying",
  "annoyed",
  "dark",
  "death",
  "war",
  "crisis",
  "collapse",
  "outrage",
  "outraged",
  "scam",
  "boring",
  "slow",
];

const EMOTION_LEXICON: Record<string, string[]> = {
  Joy: ["love", "happy", "joy", "delight", "celebrate", "thrilled", "great", "awesome", "vibrant"],
  Trust: ["trust", "reliable", "grateful", "thank", "hope", "calm", "peace", "smooth"],
  Anticipation: ["exciting", "excited", "hope", "soon", "future", "launch", "breakthrough"],
  Anger: ["hate", "angry", "anger", "outrage", "toxic", "frustrating", "annoying", "scam"],
  Fear: ["fear", "scary", "panic", "crisis", "disaster", "war", "collapse", "death"],
  Sadness: ["sad", "disappointing", "disappointed", "pain", "broken", "lose", "fail"],
  Surprise: ["incredible", "stunning", "shocking", "unexpected", "wow", "sudden"],
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these",
  "those", "as", "at", "by", "from", "into", "about", "i", "you", "he", "she",
  "we", "they", "them", "his", "her", "their", "our", "my", "me", "so", "if",
  "then", "than", "too", "very", "just", "out", "up", "down", "over", "http",
  "https", "www", "com", "latest", "reactions",
]);

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function round(n: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function analyzeSentiment(rawInput: string): SentimentResult {
  const query = rawInput.trim();
  const seedSource = query.length ? query : "neutral seed";
  const rand = mulberry32(hashString(seedSource.toLowerCase()));

  const tokens = tokenize(query);

  let posHits = 0;
  let negHits = 0;
  for (const t of tokens) {
    if (POSITIVE_WORDS.includes(t)) posHits += 1;
    if (NEGATIVE_WORDS.includes(t)) negHits += 1;
  }

  // Base lean from lexicon, with a little seeded wobble so neutral text still
  // feels organic rather than a flat 33/33/33 split.
  const lexLean = (posHits - negHits) / Math.max(1, posHits + negHits);
  const wobble = (rand() - 0.5) * 0.6;
  let polarity = clamp01((lexLean + 1) / 2) * 2 - 1; // -1..1
  polarity = Math.max(-1, Math.min(1, polarity + wobble * (posHits + negHits === 0 ? 1 : 0.35)));

  const pos = clamp01(0.34 + polarity * 0.55 + (rand() - 0.5) * 0.08);
  const neg = clamp01(0.34 - polarity * 0.55 + (rand() - 0.5) * 0.08);
  const neuRaw = clamp01(0.5 - Math.abs(polarity) * 0.42 + (rand() - 0.5) * 0.1);

  const total = pos + neg + neuRaw || 1;
  const scores: SentimentScores = {
    positive: round(pos / total),
    negative: round(neg / total),
    neutral: round(neuRaw / total),
  };

  const dominant: Sentiment =
    scores.positive >= scores.negative && scores.positive >= scores.neutral
      ? "positive"
      : scores.negative >= scores.neutral
        ? "negative"
        : "neutral";

  const intensity = clamp01(
    Math.abs(polarity) * 0.7 + Math.min(1, (posHits + negHits) / 6) * 0.3 + rand() * 0.15,
  );

  // Emotions
  const emotionScores: Record<string, number> = {};
  for (const [emotion, words] of Object.entries(EMOTION_LEXICON)) {
    let hits = 0;
    for (const t of tokens) if (words.includes(t)) hits += 1;
    const base = hits * 0.5;
    const bias =
      polarity > 0 && ["Joy", "Trust", "Anticipation", "Surprise"].includes(emotion)
        ? 0.25 + rand() * 0.4
        : polarity < 0 && ["Anger", "Fear", "Sadness"].includes(emotion)
          ? 0.25 + rand() * 0.4
          : rand() * 0.2;
    emotionScores[emotion] = base + bias;
  }
  const maxEmotion = Math.max(...Object.values(emotionScores), 1);
  const emotions: Emotion[] = Object.entries(emotionScores)
    .map(([label, v]) => ({ label, value: round(clamp01(v / maxEmotion)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Key phrases — pull interesting tokens, fall back to invented ones.
  const seen = new Set<string>();
  const candidatePhrases: KeyPhrase[] = [];
  for (const t of tokens) {
    if (t.length < 4 || STOPWORDS.has(t) || seen.has(t)) continue;
    seen.add(t);
    const ps: Sentiment = POSITIVE_WORDS.includes(t)
      ? "positive"
      : NEGATIVE_WORDS.includes(t)
        ? "negative"
        : rand() > 0.62
          ? dominant
          : "neutral";
    candidatePhrases.push({
      text: titleCase(t),
      sentiment: ps,
      weight: round(clamp01(0.5 + rand() * 0.5)),
    });
  }

  if (candidatePhrases.length < 3) {
    const fillers =
      dominant === "positive"
        ? ["community buzz", "warm response", "shared excitement"]
        : dominant === "negative"
          ? ["growing concern", "heated debate", "mixed frustration"]
          : ["measured takes", "wait and see", "quiet chatter"];
    for (const f of fillers) {
      candidatePhrases.push({
        text: titleCase(f),
        sentiment: dominant,
        weight: round(clamp01(0.45 + rand() * 0.4)),
      });
    }
  }

  const keyPhrases = candidatePhrases
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const sampleSize = 800 + Math.floor(rand() * 24000);

  const summary = buildSummary(dominant, scores, query, sampleSize);

  return {
    id: `res_${hashString(seedSource).toString(36)}_${Math.floor(rand() * 1e6).toString(36)}`,
    query: query || "(empty)",
    scores,
    dominant,
    polarity: round(polarity),
    intensity: round(intensity),
    emotions,
    keyPhrases,
    summary,
    sampleSize,
    createdAt: Date.now(),
  };
}

function buildSummary(
  dominant: Sentiment,
  scores: SentimentScores,
  query: string,
  sampleSize: number,
): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const topic = query.length > 48 ? `${query.slice(0, 48)}…` : query || "this topic";
  const samples = sampleSize.toLocaleString();
  switch (dominant) {
    case "positive":
      return `The organism is blooming. Across ~${samples} simulated signals about “${topic}”, the mood skews positive (${pct(
        scores.positive,
      )}), with energy radiating outward in warm, vibrant tendrils.`;
    case "negative":
      return `The organism contracts and spikes. ~${samples} simulated signals about “${topic}” lean negative (${pct(
        scores.negative,
      )}); reactions feel sharp, dark, and turbulent.`;
    default:
      return `The organism drifts in calm waves. ~${samples} simulated signals about “${topic}” are largely neutral (${pct(
        scores.neutral,
      )}) — measured, balanced, waiting to tip either way.`;
  }
}

/** Color palette per sentiment, reused by both the 3D shader and 2D UI. */
export const SENTIMENT_COLORS: Record<
  Sentiment,
  { core: string; glow: string; accent: string; rgb: [number, number, number] }
> = {
  positive: { core: "#39ffb0", glow: "#7af5ff", accent: "#b6ff6e", rgb: [0.22, 1.0, 0.69] },
  negative: { core: "#ff4d6d", glow: "#ff8a3d", accent: "#c026d3", rgb: [1.0, 0.3, 0.43] },
  neutral: { core: "#6ea8ff", glow: "#9d7bff", accent: "#56e0e0", rgb: [0.43, 0.66, 1.0] },
};
