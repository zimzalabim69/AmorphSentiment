/**
 * Auto-Synthesis Engine
 * Periodically sends recent signals to Groq and asks it to write a
 * natural-language "Situation Report" describing what the internet is feeling.
 */

import { randomUUID } from "crypto";
import { getKey } from "./groq";
import { insertReport, type SynthesisReport } from "./db";
import type { LiveSignal } from "./live-types";

const GROQ_HOST = "https://api.groq.com/openai/v1";

export async function generateSynthesis(signals: LiveSignal[]): Promise<SynthesisReport | null> {
  if (signals.length < 5) return null;

  const digest = signals
    .slice(-15)
    .map((s) => `[${s.source}] ${s.text.slice(0, 60)} | ${s.dominant}`)
    .join("\n");

  const prompt = `You are the central intelligence of Sentinel, a global mood tracker.

Below are ~30 recent internet signals. Write a 3-sentence Situation Report as a classified brief.

Rules:
- Sentence 1: What is the internet feeling right now? Name 2-3 topics and their sentiment.
- Sentence 2: Notable entities (people, companies, countries, tickers) with strong emotion.
- Sentence 3: Overall emotional tone — calm, agitated, excited, fearful?

Be vivid and specific. No generic filler.

DIGEST:
${digest}

Return ONLY a JSON object:
- "headline": 5-8 word headline
- "summary": 3 sentences
- "dominantSentiment": "positive" | "negative" | "neutral"
- "intensity": 0.0-1.0
- "topics": top 3 topic strings
- "anomalies": unusual observations (0-3)

JSON:`;

  try {
    const res = await fetch(`${GROQ_HOST}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getKey()}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.warn("[Synthesis] Groq returned non-OK:", res.status);
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    if (!raw) {
      console.warn("[Synthesis] Empty response from Groq");
      return null;
    }

    const clean = raw.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Try to extract JSON from markdown or text
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else {
        console.warn("[Synthesis] Could not parse JSON from:", raw.slice(0, 200));
        return null;
      }
    }

    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    const ds = String(parsed.dominantSentiment ?? "neutral").toLowerCase();
    const report: SynthesisReport = {
      id: randomUUID(),
      headline: String(parsed.headline ?? "Situation Report").slice(0, 120),
      summary: String(parsed.summary ?? "Analysis in progress.").slice(0, 600),
      dominantSentiment: ["positive", "negative", "neutral"].includes(ds) ? (ds as "positive" | "negative" | "neutral") : "neutral",
      intensity: clamp(Number(parsed.intensity) || 0.5),
      topics: Array.isArray(parsed.topics) ? parsed.topics.filter((t): t is string => typeof t === "string").slice(0, 5) : [],
      anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies.filter((t): t is string => typeof t === "string").slice(0, 3) : [],
      timestamp: Date.now(),
    };

    insertReport(report);
    console.log("[Synthesis] Generated report:", report.headline);
    return report;
  } catch (err) {
    console.warn("[Synthesis] Failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
