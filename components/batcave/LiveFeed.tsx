"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import type { SignalSource } from "@/lib/live-types";
import { memo, useMemo, useState } from "react";

function sentimentColor(dominant: string): string {
  switch (dominant) {
    case "positive": return "text-green-400";
    case "negative": return "text-red-400";
    default: return "text-blue-300";
  }
}

function sentimentDot(dominant: string): string {
  switch (dominant) {
    case "positive": return "bg-green-400";
    case "negative": return "bg-red-500";
    default: return "bg-blue-400";
  }
}

function SourceBadge({ source }: { source: SignalSource }) {
  const labels: Record<SignalSource, { label: string; color: string }> = {
    bluesky: { label: "BSky", color: "#4f8ef7" },
    rss: { label: "RSS", color: "#a0a0a0" },
    reddit: { label: "Reddit", color: "#ff4500" },
    hackernews: { label: "HN", color: "#ff6600" },
    newsapi: { label: "News", color: "#39ffb0" },
  };
  const info = labels[source];
  return (
    <span
      className="text-[9px] font-mono px-1 rounded"
      style={{ color: info.color, backgroundColor: `${info.color}15` }}
      title={`Source: ${source}`}
    >
      {info.label}
    </span>
  );
}

const SignalRow = memo(function SignalRow({
  text, dominant, source, timestamp, topics,
}: {
  text: string;
  dominant: string;
  source: SignalSource;
  timestamp: number;
  topics: string[];
}) {
  const age = Math.round((Date.now() - timestamp) / 1000);
  const ageLabel = age < 60 ? `${age}s` : `${Math.round(age / 60)}m`;
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-[var(--color-bat-border)] signal-flash">
      <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${sentimentDot(dominant)}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug ${sentimentColor(dominant)} opacity-80`}>
          {text.slice(0, 120)}{text.length > 120 ? "…" : ""}
        </p>
        {topics.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {topics.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] text-[var(--color-bat-dim)] font-mono">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <SourceBadge source={source} />
        <span className="text-[9px] text-[var(--color-bat-dim)] font-mono">{ageLabel}</span>
      </div>
    </div>
  );
});

export default function LiveFeed() {
  const signals = useBatcaveStore((s) => s.signals);
  const topicFilter = useBatcaveStore((s) => s.topicFilter);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = topicFilter === "all"
      ? signals
      : signals.filter((s) => s.topic === topicFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.text.toLowerCase().includes(q) ||
        s.entities.some((e) => e.name.toLowerCase().includes(q)) ||
        s.keyPhrases.some((p) => p.toLowerCase().includes(q))
      );
    }

    return list.slice(-40).reverse();
  }, [signals, topicFilter, search]);

  return (
    <div className="bat-panel p-3 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-bat-orange)] font-mono hud-glow">
          Live Feed
        </h3>
        <span className="text-[9px] text-[var(--color-bat-dim)] font-mono">
          {signals.length} signals
        </span>
      </div>

      {/* Search filter */}
      <div className="mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter signals…"
          className="w-full px-2 py-1 text-[10px] font-mono bg-[var(--color-bat-dark)] border border-[var(--color-bat-border)] rounded text-[var(--color-bat-text)] placeholder:text-[var(--color-bat-dim)] focus:border-[var(--color-bat-orange)] focus:outline-none transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-0" style={{ maxHeight: "100%" }}>
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--color-bat-dim)] italic">
            {search.trim() ? "No matching signals." : "Waiting for signals…"}
          </p>
        )}
        {filtered.map((s) => (
          <SignalRow
            key={s.id}
            text={s.text}
            dominant={s.dominant}
            source={s.source}
            timestamp={s.timestamp}
            topics={s.topics}
          />
        ))}
      </div>
    </div>
  );
}
