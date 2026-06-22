"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { useAppStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { getWorkerStatus, onWorkerStatusChange, type WorkerStatus } from "@/lib/sentiment-worker";
import TopicFilters from "./TopicFilters";
import FocusInput from "./FocusInput";

const STATUS_DOT: Record<WorkerStatus, { color: string; label: string }> = {
  idle: { color: "#39ffb0", label: "GROQ READY" },
  processing: { color: "#ffab1a", label: "ANALYZING…" },
  error: { color: "#ff3d3d", label: "FALLBACK" },
  offline: { color: "#4a5068", label: "OFFLINE" },
};

function StatusBadge({ status }: { status: WorkerStatus }) {
  const info = STATUS_DOT[status];
  return (
    <div
      className="flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded border"
      style={{
        color: info.color,
        borderColor: `${info.color}40`,
        backgroundColor: `${info.color}10`,
      }}
      title="Groq cloud LLM status"
      aria-live="polite"
      aria-label={`Groq status: ${info.label}`}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ backgroundColor: info.color }}
        aria-hidden="true"
      />
      {info.label}
    </div>
  );
}

function ControlButton({
  onClick,
  children,
  title,
  active = false,
  activeColor,
  danger = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  active?: boolean;
  activeColor?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
        danger
          ? "border-[var(--color-bat-border)] text-[var(--color-bat-dim)] hover:text-[var(--color-bat-red)] hover:border-[var(--color-bat-red)]"
          : "border-[var(--color-bat-border)] hover:border-[var(--color-bat-orange)]"
      }`}
      style={active && activeColor ? { color: activeColor } : undefined}
      title={title}
      aria-pressed={active}
      type="button"
    >
      {children}
    </button>
  );
}

function StreamDot({ connected }: { connected: boolean }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{
        backgroundColor: connected ? "#39ffb0" : "#ff3d3d",
        boxShadow: connected
          ? "0 0 6px rgba(57,255,176,0.5)"
          : "0 0 6px rgba(255,61,61,0.5)",
      }}
      title={connected ? "Live stream connected" : "Live stream disconnected"}
      aria-label={connected ? "Stream connected" : "Stream disconnected"}
    />
  );
}

function TrendingBar() {
  const trending = useBatcaveStore((s) => s.trendingTopics);
  const enterHyperFocus = useBatcaveStore((s) => s.enterHyperFocus);

  if (trending.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-t border-[var(--color-bat-border)] bg-[var(--color-bat-panel)]/50 overflow-x-auto">
      <span className="text-[9px] font-mono text-[var(--color-bat-orange)] uppercase tracking-wider shrink-0">
        🔥 Trending
      </span>
      {trending.slice(0, 6).map((t) => (
        <button
          key={t.topic}
          onClick={() => enterHyperFocus(t.topic)}
          className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--color-bat-border)] hover:border-[var(--color-bat-cyan)] hover:text-[var(--color-bat-cyan)] transition-colors"
          title={`${t.volume} mentions · ${t.velocity}/min — click to focus`}
          type="button"
        >
          {t.topic}
          <span className="ml-1 text-[var(--color-bat-dim)]">{t.volume}</span>
        </button>
      ))}
    </div>
  );
}

export default function BatcaveTopBar() {
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const toggleSound = useAppStore((s) => s.toggleSound);
  const connected = useBatcaveStore((s) => s.connected);
  const hyperFocus = useBatcaveStore((s) => s.hyperFocus);

  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>(getWorkerStatus);

  useEffect(() => {
    const unsub = onWorkerStatusChange(setWorkerStatus);
    return () => { unsub(); };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Main top bar */}
      <div className="bat-panel px-4 py-2 flex items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-sm font-mono font-bold tracking-wider text-[var(--color-bat-orange)] hud-glow whitespace-nowrap">
            SENTINEL
          </h1>
          <span className="text-[9px] text-[var(--color-bat-dim)] font-mono hidden sm:inline whitespace-nowrap">
            MULTI-SOURCE PULSE
          </span>
          <div className="flex items-center gap-1.5 ml-1 hidden md:flex" title="Live stream status">
            <StreamDot connected={connected} />
            <span className="text-[9px] font-mono text-[var(--color-bat-dim)]">
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Filters (center) */}
        <div className="hidden md:flex items-center gap-3 min-w-0">
          <TopicFilters />
          <div className="w-px h-5 bg-[var(--color-bat-border)] shrink-0" />
          <FocusInput />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {hyperFocus.active && (
            <div
              className="flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded border animate-pulse"
              style={{
                color: "var(--color-bat-cyan)",
                borderColor: "rgba(0,229,255,0.4)",
                backgroundColor: "rgba(0,229,255,0.1)",
              }}
              title={`HyperFocus active on "${hyperFocus.keyword}" — press Escape to exit`}
            >
              <span aria-hidden="true">◉</span>
              <span className="max-w-[8rem] truncate">{hyperFocus.keyword.toUpperCase()}</span>
            </div>
          )}

          <StatusBadge status={workerStatus} />

          <ControlButton
            onClick={toggleSound}
            active={soundEnabled}
            activeColor="var(--color-bat-amber)"
            title={soundEnabled ? "Mute (M)" : "Unmute (M)"}
          >
            {soundEnabled ? "♪ ON" : "♪ OFF"}
          </ControlButton>
        </div>
      </div>

      {/* Trending topics bar */}
      <TrendingBar />
    </div>
  );
}
