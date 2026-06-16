"use client";

import { useBatcaveStore } from "@/lib/batcave-store";

export default function BottomHUD() {
  const totalSignals = useBatcaveStore((s) => s.totalSignals);
  const connected = useBatcaveStore((s) => s.connected);
  const aggregates = useBatcaveStore((s) => s.aggregates);
  const activeWindow = useBatcaveStore((s) => s.activeWindow);
  const setActiveWindow = useBatcaveStore((s) => s.setActiveWindow);

  const activeAgg = aggregates.find((a) => a.window === activeWindow);
  const windowVolume = activeAgg?.volume || 0;

  const windows = ["30s", "2min", "10min"] as const;

  return (
    <div className="bat-panel px-4 py-2 flex items-center justify-between gap-4 text-[10px] font-mono">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500 hud-pulse" : "bg-red-500"}`} />
        <span className="text-[var(--color-bat-dim)]">
          {connected ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      {/* Signal counter */}
      <div className="flex items-center gap-2">
        <span className="text-[var(--color-bat-dim)]">SIGNALS:</span>
        <span className="text-[var(--color-bat-amber)] hud-glow text-xs">
          {totalSignals.toLocaleString()}
        </span>
      </div>

      {/* Window volume */}
      <div className="flex items-center gap-2">
        <span className="text-[var(--color-bat-dim)]">WINDOW:</span>
        <span className="text-[var(--color-bat-cyan)]">{windowVolume}</span>
        <span className="text-[var(--color-bat-dim)]">signals</span>
      </div>

      {/* Window selector */}
      <div className="flex items-center gap-1">
        {windows.map((w) => (
          <button
            key={w}
            onClick={() => setActiveWindow(w)}
            className={`px-2 py-0.5 rounded text-[9px] transition-colors ${
              activeWindow === w
                ? "bg-[var(--color-bat-orange)] text-black"
                : "bg-[var(--color-bat-dark)] text-[var(--color-bat-dim)] hover:text-[var(--color-bat-orange)]"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Keyboard hint */}
      <div className="hidden lg:flex items-center gap-2 text-[var(--color-bat-dim)]">
        <span className="opacity-60">SPACE</span>=pulse
        <span className="opacity-60 ml-1">←→</span>=filter
      </div>
    </div>
  );
}
