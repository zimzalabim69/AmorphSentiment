"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

export default function FocusPanels() {
  const hyperFocus = useBatcaveStore((s) => s.hyperFocus);
  const totalSignals = useBatcaveStore((s) => s.totalSignals);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!hyperFocus.active || !hyperFocus.startedAt) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.round((Date.now() - hyperFocus.startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hyperFocus.active, hyperFocus.startedAt]);

  const stats = useMemo(() => {
    const signals = hyperFocus.focusedSignals;
    if (signals.length === 0) {
      return { positive: 0, negative: 0, neutral: 0, avgIntensity: 0, topPhrases: [] as string[], matchCount: 0 };
    }
    let pos = 0, neg = 0, neu = 0;
    const phraseMap = new Map<string, number>();
    for (const s of signals) {
      if (s.dominant === "positive") pos++;
      else if (s.dominant === "negative") neg++;
      else neu++;
      // Extract words for phrases
      const words = s.text.split(/\s+/).filter((w) => w.length > 4);
      for (const w of words.slice(0, 5)) {
        const lower = w.toLowerCase().replace(/[^a-z]/g, "");
        if (lower.length > 4) phraseMap.set(lower, (phraseMap.get(lower) || 0) + 1);
      }
    }
    const total = signals.length;
    const avgIntensity = signals.reduce((sum, s) => sum + s.intensity, 0) / total;
    const topPhrases = [...phraseMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word);

    return {
      positive: Math.round((pos / total) * 100),
      negative: Math.round((neg / total) * 100),
      neutral: Math.round((neu / total) * 100),
      avgIntensity: Math.round(avgIntensity * 100),
      topPhrases,
      matchCount: total,
    };
  }, [hyperFocus.focusedSignals]);

  return (
    <>
      {/* Bottom panel — stats + sparkline */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-20"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="bat-panel mx-4 mb-4 px-5 py-3 flex items-center gap-6 justify-between">
          {/* Match counter */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono text-[var(--color-bat-dim)] uppercase">Matches</span>
            <span className="text-lg font-mono font-bold text-[var(--color-bat-cyan)] hud-glow">
              {stats.matchCount}
            </span>
          </div>

          {/* Sentiment breakdown */}
          <div className="flex gap-4">
            <SentimentBar label="POS" value={stats.positive} color="var(--color-bat-green, #39ffb0)" />
            <SentimentBar label="NEG" value={stats.negative} color="var(--color-bat-red)" />
            <SentimentBar label="NEU" value={stats.neutral} color="var(--color-bat-cyan)" />
          </div>

          {/* Intensity sparkline */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-mono text-[var(--color-bat-dim)] uppercase">Intensity Wave</span>
            <Sparkline data={hyperFocus.sentimentHistory} />
          </div>

          {/* Avg intensity */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono text-[var(--color-bat-dim)] uppercase">Avg Power</span>
            <span className="text-lg font-mono font-bold text-[var(--color-bat-orange)] hud-glow">
              {stats.avgIntensity}%
            </span>
          </div>

          {/* Time elapsed */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono text-[var(--color-bat-dim)] uppercase">Elapsed</span>
            <span className="text-xs font-mono text-[var(--color-bat-amber)]">{elapsed}s</span>
          </div>

          {/* Total throughput */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono text-[var(--color-bat-dim)] uppercase">Global</span>
            <span className="text-xs font-mono text-[var(--color-bat-dim)]">
              {totalSignals.toLocaleString()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Right panel — live matching posts */}
      <motion.div
        className="absolute top-16 right-0 bottom-20 w-72 z-20 overflow-hidden"
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="bat-panel h-full mr-4 p-3 flex flex-col overflow-hidden">
          <h3 className="text-[10px] font-mono text-[var(--color-bat-orange)] tracking-wider mb-2 uppercase">
            Matching Signals
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
            {hyperFocus.focusedSignals.length === 0 ? (
              <p className="text-[10px] font-mono text-[var(--color-bat-dim)] animate-pulse">
                Scanning for &quot;{hyperFocus.keyword}&quot;…
              </p>
            ) : (
              [...hyperFocus.focusedSignals].reverse().slice(0, 30).map((s) => (
                <div key={s.id} className="text-[10px] font-mono leading-tight">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                    style={{
                      backgroundColor:
                        s.dominant === "positive" ? "#39ffb0" :
                        s.dominant === "negative" ? "#ff4d6d" : "#6ea8ff",
                    }}
                  />
                  <span className="text-[var(--color-bat-text)]">
                    {s.text.length > 120 ? s.text.slice(0, 120) + "…" : s.text}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Top phrases */}
          {stats.topPhrases.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--color-bat-border)]">
              <span className="text-[9px] font-mono text-[var(--color-bat-dim)] uppercase">Hot Phrases</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {stats.topPhrases.map((p) => (
                  <span
                    key={p}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bat-orange)]/10 text-[var(--color-bat-orange)] border border-[var(--color-bat-orange)]/30"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function SentimentBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-mono text-[var(--color-bat-dim)]">{label}</span>
      <div className="w-10 h-1.5 bg-[var(--color-bat-dark)] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{value}%</span>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) {
    return <div className="w-32 h-6 bg-[var(--color-bat-dark)] rounded opacity-50" />;
  }

  const width = 128;
  const height = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const clamped = Math.max(0, Math.min(1, v));
    const y = height - clamped * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="opacity-80">
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-bat-orange)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Glow trail */}
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-bat-orange)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
      />
    </svg>
  );
}
