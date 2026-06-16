"use client";

import { useBatcaveStore } from "@/lib/batcave-store";

export default function IntensityMeter() {
  const globalIntensity = useBatcaveStore((s) => s.globalIntensity);
  const pct = Math.round(globalIntensity * 100);

  const barColor =
    pct > 70
      ? "bg-[var(--color-bat-red)]"
      : pct > 40
        ? "bg-[var(--color-bat-orange)]"
        : "bg-[var(--color-bat-amber)]";

  return (
    <div className="bat-panel p-3">
      <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-bat-orange)] font-mono mb-2 hud-glow">
        Global Intensity
      </h3>
      <div className="relative h-3 bg-[var(--color-bat-dark)] rounded overflow-hidden border border-[var(--color-bat-border)]">
        <div
          className={`h-full transition-all duration-500 ${barColor} ${pct > 60 ? "intensity-bar" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-[var(--color-bat-dim)]">CALM</span>
        <span className="text-[11px] font-mono text-[var(--color-bat-orange)] hud-glow">{pct}%</span>
        <span className="text-[9px] font-mono text-[var(--color-bat-dim)]">CHAOS</span>
      </div>
    </div>
  );
}
