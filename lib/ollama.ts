/**
 * Ollama client for local LLM-powered sentiment analysis, NER, and topic extraction.
 * Expects Ollama running at localhost:11434 (default).
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

export interface OllamaSentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  scores: { positive: number; negative: number; neutral: number };
  intensity: number;
  emotions: { label: string; value: number }[];
  entities: { name: string; type: string }[];
  key_phrases: string[];
  topics: string[];
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

/**
 * Analyze a batch of texts via Ollama. Returns results in the same order.
 */
export async function analyzeBatch(texts: string[]): Promise<OllamaSentimentResult[]> {
  if (texts.length === 0) return [];

  // Build a single prompt with numbered texts
  const items = texts
    .map((t, i) => `--- ITEM ${i + 1} ---\n${t.slice(0, 280)}`)
    .join("\n\n");

  const prompt = buildPrompt(items, texts.length);

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
        num_predict: 2048,
        seed: 42,
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as OllamaResponse;
  return parseBatchResponse(data.response, texts.length);
}

/**
 * Analyze a single text (convenience wrapper).
 */
export async function analyzeOne(text: string): Promise<OllamaSentimentResult> {
  const results = await analyzeBatch([text]);
  return results[0];
}

function buildPrompt(itemsBlock: string, count: number): string {
  return `You are a real-time sentiment and entity analysis engine. Analyze ${count} news/social media snippets.

For EACH item, produce a JSON object with these exact fields:
- "sentiment": "positive" | "negative" | "neutral"
- "scores": {"positive": 0.0-1.0, "negative": 0.0-1.0, "neutral": 0.0-1.0} (must sum to ~1.0)
- "intensity": 0.0-1.0 (how emotional/strong the reaction is)
- "emotions": array of {"label": "Joy|Trust|Anticipation|Anger|Fear|Sadness|Surprise", "value": 0.0-1.0}
- "entities": array of {"name": string, "type": "PERSON|ORG|GPE|PRODUCT|TICKER|EVENT|TECH"} — extract people, organizations, countries, companies, stock tickers, product names, major events
- "key_phrases": array of 2-5 most relevant short phrases from the text
- "topics": array of 1-3 topic tags (e.g. "crypto", "politics", "tech", "conflict", "health", "climate")

Return ONLY a valid JSON array with ${count} objects, one per item, in the same order. No markdown, no explanations.

${itemsBlock}

JSON array:`;
}

function parseBatchResponse(raw: string, expectedCount: number): OllamaSentimentResult[] {
  const clean = raw.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Try extracting first JSON array from the text
    const match = clean.match(/\[\s*{[\s\S]*}\s*\]/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return fallbackResults(expectedCount);
      }
    } else {
      return fallbackResults(expectedCount);
    }
  }

  if (!Array.isArray(parsed)) return fallbackResults(expectedCount);

  const results: OllamaSentimentResult[] = [];
  for (let i = 0; i < expectedCount; i++) {
    const item = parsed[i];
    if (isValidResult(item)) {
      results.push(normalizeResult(item));
    } else {
      results.push(fallbackResult());
    }
  }
  return results;
}

function isValidResult(v: unknown): v is OllamaSentimentResult {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.sentiment === "string" &&
    typeof r.scores === "object" &&
    r.scores !== null &&
    typeof (r.scores as Record<string, unknown>).positive === "number" &&
    typeof (r.scores as Record<string, unknown>).negative === "number" &&
    typeof (r.scores as Record<string, unknown>).neutral === "number" &&
    typeof r.intensity === "number"
  );
}

function normalizeResult(r: OllamaSentimentResult): OllamaSentimentResult {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const scores = {
    positive: clamp(r.scores?.positive ?? 0.33),
    negative: clamp(r.scores?.negative ?? 0.33),
    neutral: clamp(r.scores?.neutral ?? 0.34),
  };
  const total = scores.positive + scores.negative + scores.neutral || 1;
  scores.positive /= total;
  scores.negative /= total;
  scores.neutral /= total;

  const sentiment: OllamaSentimentResult["sentiment"] =
    scores.positive >= scores.negative && scores.positive >= scores.neutral
      ? "positive"
      : scores.negative >= scores.neutral
        ? "negative"
        : "neutral";

  return {
    sentiment,
    scores,
    intensity: clamp(r.intensity ?? 0.4),
    emotions: (r.emotions ?? [])
      .filter((e) => typeof e?.label === "string" && typeof e?.value === "number")
      .map((e) => ({ label: e.label, value: clamp(e.value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7),
    entities: (r.entities ?? [])
      .filter((e) => typeof e?.name === "string" && typeof e?.type === "string")
      .map((e) => ({ name: e.name.trim(), type: e.type.trim().toUpperCase() }))
      .slice(0, 8),
    key_phrases: (r.key_phrases ?? [])
      .filter((p) => typeof p === "string")
      .map((p) => p.trim())
      .slice(0, 5),
    topics: (r.topics ?? [])
      .filter((t) => typeof t === "string")
      .map((t) => t.trim().toLowerCase())
      .slice(0, 3),
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

function fallbackResults(count: number): OllamaSentimentResult[] {
  return Array.from({ length: count }, () => fallbackResult());
}
