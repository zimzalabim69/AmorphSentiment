/**
 * Groq cloud LLM client — fast, free-tier friendly, no local GPU needed.
 * Sign up at https://console.groq.com/keys for a free API key.
 *
 * Replaces the local Ollama client with identical interface so the rest
 * of the app doesn't need to change.
 */

const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
const GROQ_HOST = "https://api.groq.com/openai/v1";

export interface GroqSentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  scores: { positive: number; negative: number; neutral: number };
  intensity: number;
  emotions: { label: string; value: number }[];
  entities: { name: string; type: string }[];
  key_phrases: string[];
  topics: string[];
}

function hasKey(): boolean {
  return (process.env.GROQ_API_KEY ?? "").length > 0;
}

export function getKey(): string {
  return process.env.GROQ_API_KEY ?? "";
}

/**
 * Quick health check — returns true if Groq is reachable and key is valid.
 */
export async function checkGroqHealth(): Promise<boolean> {
  if (!hasKey()) return false;
  try {
    const res = await fetch(`${GROQ_HOST}/models`, {
      headers: { Authorization: `Bearer ${getKey()}` },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Analyze a batch of texts via Groq. Returns results in the same order.
 * Retries with backoff on 429 rate limit.
 */
export async function analyzeBatch(texts: string[]): Promise<GroqSentimentResult[]> {
  if (!hasKey()) throw new Error("GROQ_API_KEY is not set");
  if (texts.length === 0) return [];

  const prompt = buildPrompt(texts);

  const MAX_RETRIES = 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${GROQ_HOST}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getKey()}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 512,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const body = await res.text();
        if (res.status === 429) {
          const delay = (attempt + 1) * 4_000 + Math.random() * 2_000;
          console.warn(`[Groq] 429 rate limit, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1})`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.warn(`[Groq] HTTP ${res.status}: ${body.slice(0, 200)}`);
        throw new Error(`Groq HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content ?? "";
      const parsed = parseBatchResponse(raw, texts.length);
      // Accept if at least one result has non-empty entities or emotions (means LLM did real work)
      const hasRealData = parsed.some((p) => p.entities.length > 0 || p.emotions.length > 0 || p.sentiment !== "neutral" || p.topics.length > 0);
      if (!hasRealData) {
        console.warn("[Groq] All fallback/neutral results — retrying");
        throw new Error("Groq returned empty results");
      }
      return parsed;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Groq] attempt ${attempt + 1} failed: ${msg}`);
      if (attempt === MAX_RETRIES - 1) break;
      await new Promise((r) => setTimeout(r, (attempt + 1) * 3_000));
    }
  }

  throw lastErr ?? new Error("Groq analysis failed after retries");
}

/**
 * Analyze a single text (convenience wrapper).
 */
export async function analyzeOne(text: string): Promise<GroqSentimentResult> {
  const results = await analyzeBatch([text]);
  return results[0];
}

function buildPrompt(texts: string[]): string {
  const items = texts.map((t, i) => `${i + 1}. ${t.slice(0, 200)}`).join("\n");
  return `Analyze these ${texts.length} posts. Return exactly ${texts.length} JSON objects in a JSON array, one per post.

${items}

Each object must have: sentiment (positive/negative/neutral), scores (positive, negative, neutral numbers 0-1 summing to 1), intensity (0-1), emotions (array of {label, value}), entities (array of {name, type}), key_phrases (array of strings), topics (array of strings).

Return ONLY the JSON array, no markdown, no explanation.`;
}

function parseBatchResponse(raw: string, expectedCount: number): GroqSentimentResult[] {
  const clean = raw.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();

  // Strategy 1: direct parse
  let parsed: unknown = tryParse(clean);

  // Strategy 2: find array by bracket balance
  if (!Array.isArray(parsed)) {
    parsed = tryParse(extractBalanced(clean, "[", "]"));
  }

  // Strategy 3: extract individual objects and wrap in array
  if (!Array.isArray(parsed)) {
    const objs = extractObjects(clean);
    if (objs.length > 0) parsed = objs;
  }

  if (!Array.isArray(parsed)) {
    console.warn(`[Groq parse] Could not extract JSON array. Raw first 300 chars:\n${clean.slice(0, 300)}`);
    return fallbackResults(expectedCount);
  }

  const results: GroqSentimentResult[] = [];
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

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Extract the first top-level balanced substring for the given open/close chars */
function extractBalanced(text: string, open: string, close: string): string {
  const start = text.indexOf(open);
  if (start === -1) return "";
  let count = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) count++;
    else if (text[i] === close) count--;
    if (count === 0) return text.slice(start, i + 1);
  }
  return "";
}

/** Extract all top-level { ... } objects from text */
function extractObjects(text: string): unknown[] {
  const objs: unknown[] = [];
  let idx = 0;
  while (idx < text.length) {
    const objStart = text.indexOf("{", idx);
    if (objStart === -1) break;
    let braceCount = 0;
    let objEnd = objStart;
    for (let j = objStart; j < text.length; j++) {
      if (text[j] === "{") braceCount++;
      else if (text[j] === "}") {
        braceCount--;
        if (braceCount === 0) {
          objEnd = j;
          break;
        }
      }
    }
    if (objEnd > objStart) {
      try {
        const obj = JSON.parse(text.slice(objStart, objEnd + 1));
        if (typeof obj === "object" && obj !== null) objs.push(obj);
      } catch { /* skip */ }
    }
    idx = objEnd + 1;
  }
  return objs;
}

function isValidResult(v: unknown): v is GroqSentimentResult {
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

function normalizeResult(r: GroqSentimentResult): GroqSentimentResult {
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

  const sentiment: GroqSentimentResult["sentiment"] =
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

function fallbackResult(): GroqSentimentResult {
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

function fallbackResults(count: number): GroqSentimentResult[] {
  return Array.from({ length: count }, () => fallbackResult());
}
