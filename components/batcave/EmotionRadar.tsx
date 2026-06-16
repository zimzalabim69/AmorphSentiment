"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { useMemo } from "react";
import type { Emotion } from "@/lib/types";

const RADAR_SIZE = 180;
const CENTER = RADAR_SIZE / 2;
const RADIUS = RADAR_SIZE / 2 - 20;

function polarToXY(angle: number, r: number): [number, number] {
  return [
    CENTER + r * Math.cos(angle - Math.PI / 2),
    CENTER + r * Math.sin(angle - Math.PI / 2),
  ];
}

export default function EmotionRadar() {
  const aggregates = useBatcaveStore((s) => s.aggregates);
  const activeWindow = useBatcaveStore((s) => s.activeWindow);

  const emotions: Emotion[] = useMemo(() => {
    const agg = aggregates.find((a) => a.window === activeWindow);
    return agg?.emotions || [];
  }, [aggregates, activeWindow]);

  const points = useMemo(() => {
    if (emotions.length === 0) return "";
    const step = (2 * Math.PI) / emotions.length;
    return emotions
      .map((e, i) => {
        const [x, y] = polarToXY(i * step, RADIUS * Math.min(e.value, 1));
        return `${x},${y}`;
      })
      .join(" ");
  }, [emotions]);

  return (
    <div className="bat-panel p-3">
      <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-bat-orange)] font-mono mb-2 hud-glow">
        Emotion Radar
      </h3>
      <svg width={RADAR_SIZE} height={RADAR_SIZE} className="mx-auto">
        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <circle
            key={r}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS * r}
            fill="none"
            stroke="rgba(255,107,44,0.12)"
            strokeWidth="0.5"
          />
        ))}
        {/* Axis lines */}
        {emotions.map((_, i) => {
          const step = (2 * Math.PI) / emotions.length;
          const [x, y] = polarToXY(i * step, RADIUS);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="rgba(255,107,44,0.08)"
              strokeWidth="0.5"
            />
          );
        })}
        {/* Filled radar polygon */}
        {points && (
          <polygon
            points={points}
            fill="rgba(255,107,44,0.15)"
            stroke="var(--color-bat-orange)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}
        {/* Labels */}
        {emotions.map((e, i) => {
          const step = (2 * Math.PI) / emotions.length;
          const [x, y] = polarToXY(i * step, RADIUS + 14);
          return (
            <text
              key={e.label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[var(--color-bat-dim)] text-[8px] font-mono"
            >
              {e.label.slice(0, 3).toUpperCase()}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
