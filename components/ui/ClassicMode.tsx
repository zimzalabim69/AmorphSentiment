"use client";

import { SENTIMENT_COLORS } from "@/lib/sentiment";
import { useAppStore } from "@/lib/store";
import type { Sentiment } from "@/lib/types";

/**
 * Plain, accessible "dashboard" fallback — no WebGL, no morphing. Useful for
 * reduced-motion users, low-power devices, or anyone who just wants the numbers.
 */
export default function ClassicMode() {
  const result = useAppStore((s) => s.result);
  const phase = useAppStore((s) => s.phase);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-1 text-lg font-semibold text-white">Sentiment dashboard</h2>
        <p className="mb-6 text-sm text-white/45">
          Classic mode · simulated analysis, no animations
        </p>

        {phase === "analyzing" && (
          <p className="animate-pulse text-sm text-white/60">Analyzing…</p>
        )}

        {!result && phase !== "analyzing" && (
          <p className="text-sm text-white/50">
            Enter a topic or pick a preset above, then press Analyze.
          </p>
        )}

        {result && phase === "result" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40">Overall</p>
              <p
                className="text-2xl font-bold capitalize"
                style={{ color: SENTIMENT_COLORS[result.dominant].core }}
              >
                {result.dominant}
              </p>
              <p className="mt-2 text-sm text-white/65">{result.summary}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(["positive", "neutral", "negative"] as Sentiment[]).map((s) => (
                <div
                  key={s}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 text-center"
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: SENTIMENT_COLORS[s].core }}
                  >
                    {Math.round(result.scores[s] * 100)}%
                  </div>
                  <div className="mt-1 text-xs capitalize text-white/50">{s}</div>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Emotions</p>
              <div className="space-y-2">
                {result.emotions.map((e) => (
                  <div key={e.label} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm text-white/70">{e.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-white/60"
                        style={{ width: `${e.value * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-xs text-white/50">
                      {Math.round(e.value * 100)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-white/40">
                Key phrases
              </p>
              <div className="flex flex-wrap gap-2">
                {result.keyPhrases.map((kp, i) => (
                  <span
                    key={`${kp.text}-${i}`}
                    className="rounded-md border border-white/10 px-2.5 py-1 text-sm"
                    style={{ color: SENTIMENT_COLORS[kp.sentiment].core }}
                  >
                    {kp.text}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-white/30">
              Simulated from ~{result.sampleSize.toLocaleString()} signals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
