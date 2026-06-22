"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { useMemo } from "react";

export default function QuickStats() {
  const signals = useBatcaveStore((s) => s.signals);
  const aggregates = useBatcaveStore((s) => s.aggregates);
  const activeWindow = useBatcaveStore((s) => s.activeWindow);
  const connected = useBatcaveStore((s) => s.connected);

  const stats = useMemo(() => {
    const active = aggregates.find((a) => a.window === activeWindow);
    if (!active || active.volume === 0) {
      return {
        sentiment: 0,
        volume: signals.length,
        emotion: "neutral",
        intensity: 0,
      };
    }
    const polarity = active.scores.positive - active.scores.negative;
    return {
      sentiment: polarity,
      volume: active.volume,
      emotion: active.dominant,
      intensity: active.intensity,
    };
  }, [aggregates, activeWindow, signals.length]);

  const sentimentPct = Math.round(stats.sentiment * 100);
  const sentColor = stats.sentiment > 0.1 ? "#39ffb0" : stats.sentiment < -0.1 ? "#ff3d3d" : "#a0a0a0";
  const sentBg = stats.sentiment > 0.1 ? "rgba(57,255,176,0.08)" : stats.sentiment < -0.1 ? "rgba(255,61,61,0.08)" : "transparent";
  const sentBorder = stats.sentiment > 0.1 ? "rgba(57,255,176,0.25)" : stats.sentiment < -0.1 ? "rgba(255,61,61,0.25)" : "var(--color-bat-border)";

  return (
    <div className="bat-panel p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-bat-orange)] font-mono hud-glow">
          Pulse
        </h3>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? "animate-pulse" : ""}`}
            style={{
              backgroundColor: connected ? "#39ffb0" : "#ff3d3d",
              boxShadow: connected ? "0 0 6px rgba(57,255,176,0.5)" : "0 0 6px rgba(255,61,61,0.5)",
            }}
          />
          <span className="text-[9px] font-mono text-[var(--color-bat-dim)]">
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg border p-2.5"
          style={{ borderColor: sentBorder, backgroundColor: sentBg }}
        >
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-bat-dim)] font-mono mb-0.5">
            Sentiment
          </div>
          <div className="text-lg font-bold font-mono" style={{ color: sentColor }}>
            {sentimentPct > 0 ? "+" : ""}{sentimentPct}%
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-bat-border)] p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-bat-dim)] font-mono mb-0.5">
            Volume
          </div>
          <div className="text-lg font-bold font-mono text-[var(--color-bat-cyan)]">
            {stats.volume}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-bat-border)] p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-bat-dim)] font-mono mb-0.5">
            Mood
          </div>
          <div
            className="text-lg font-bold font-mono uppercase"
            style={{
              color:
                stats.emotion === "positive"
                  ? "#39ffb0"
                  : stats.emotion === "negative"
                    ? "#ff3d3d"
                    : "#a0a0a0",
            }}
          >
            {stats.emotion}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-bat-border)] p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-[var(--color-bat-dim)] font-mono mb-0.5">
            Intensity
          </div>
          <div className="text-lg font-bold font-mono text-[var(--color-bat-amber)]">
            {Math.round(stats.intensity * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
