"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SENTIMENT_COLORS } from "@/lib/sentiment";
import { useAppStore } from "@/lib/store";
import type { Sentiment } from "@/lib/types";

const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Positive",
  negative: "Negative",
  neutral: "Neutral",
};

export default function ResultsPanel() {
  const result = useAppStore((s) => s.result);
  const phase = useAppStore((s) => s.phase);
  const reset = useAppStore((s) => s.reset);

  const show = phase === "result" && result;

  return (
    <AnimatePresence>
      {show && result && (
        <motion.aside
          key={result.id}
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="pointer-events-auto max-h-[70vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl sm:p-6"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                Organism reading
              </p>
              <h2
                className="text-2xl font-bold"
                style={{ color: SENTIMENT_COLORS[result.dominant].core }}
              >
                {SENTIMENT_LABEL[result.dominant]}
              </h2>
            </div>
            <button
              onClick={reset}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              Reset
            </button>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-white/70">{result.summary}</p>

          {/* Scores */}
          <div className="mb-5 space-y-2.5">
            {(["positive", "neutral", "negative"] as Sentiment[]).map((s) => (
              <ScoreBar key={s} sentiment={s} value={result.scores[s]} />
            ))}
          </div>

          {/* Emotions */}
          <div className="mb-5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
              Emotional spectrum
            </p>
            <div className="flex flex-wrap gap-2">
              {result.emotions.map((e, i) => (
                <motion.span
                  key={e.label}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/80"
                >
                  {e.label}
                  <span className="font-mono text-white/45">
                    {Math.round(e.value * 100)}
                  </span>
                </motion.span>
              ))}
            </div>
          </div>

          {/* Key phrases as floating tendril nodes */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
              Key phrases
            </p>
            <div className="flex flex-wrap gap-2">
              {result.keyPhrases.map((kp, i) => {
                const c = SENTIMENT_COLORS[kp.sentiment];
                return (
                  <motion.span
                    key={`${kp.text}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: [0, -3, 0] }}
                    transition={{
                      opacity: { delay: 0.2 + i * 0.06 },
                      y: { duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" },
                    }}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: `${c.core}1f`,
                      border: `1px solid ${c.core}55`,
                      color: c.core,
                      fontSize: `${0.72 + kp.weight * 0.18}rem`,
                    }}
                  >
                    {kp.text}
                  </motion.span>
                );
              })}
            </div>
          </div>

          <p className="mt-5 text-[11px] text-white/30">
            Simulated from ~{result.sampleSize.toLocaleString()} signals · intensity{" "}
            {Math.round(result.intensity * 100)}%
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function ScoreBar({ sentiment, value }: { sentiment: Sentiment; value: number }) {
  const c = SENTIMENT_COLORS[sentiment];
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="capitalize text-white/60">{sentiment}</span>
        <span className="font-mono text-white/50">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${c.core}, ${c.glow})` }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 16, delay: 0.1 }}
        />
      </div>
    </div>
  );
}
