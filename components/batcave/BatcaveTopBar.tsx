"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { useAppStore } from "@/lib/store";
import TopicFilters from "./TopicFilters";

export default function BatcaveTopBar() {
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const toggleSound = useAppStore((s) => s.toggleSound);
  const toggleBatcaveMode = useBatcaveStore((s) => s.toggleBatcaveMode);

  return (
    <div className="bat-panel px-4 py-2 flex items-center justify-between gap-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-mono font-bold tracking-wider text-[var(--color-bat-orange)] hud-glow">
          BATCAVE<span className="text-[var(--color-bat-dim)]">::</span>SENTINEL
        </h1>
        <span className="text-[9px] text-[var(--color-bat-dim)] font-mono hidden sm:inline">
          GLOBAL SENTIMENT ORGANISM
        </span>
      </div>

      {/* Filters (center) */}
      <div className="hidden md:block">
        <TopicFilters />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="text-[10px] font-mono px-2 py-1 rounded border border-[var(--color-bat-border)] transition-colors hover:border-[var(--color-bat-orange)]"
          style={{ color: soundEnabled ? "var(--color-bat-amber)" : "var(--color-bat-dim)" }}
          title={soundEnabled ? "Mute" : "Unmute"}
        >
          {soundEnabled ? "♪ ON" : "♪ OFF"}
        </button>

        {/* Exit batcave */}
        <button
          onClick={toggleBatcaveMode}
          className="text-[10px] font-mono px-2 py-1 rounded border border-[var(--color-bat-border)] text-[var(--color-bat-dim)] hover:text-[var(--color-bat-red)] hover:border-[var(--color-bat-red)] transition-colors"
          title="Exit Batcave mode"
        >
          EXIT
        </button>
      </div>
    </div>
  );
}
