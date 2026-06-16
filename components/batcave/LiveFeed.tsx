"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { memo, useMemo } from "react";

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

const SignalRow = memo(function SignalRow({ text, dominant, source, timestamp }: {
  text: string; dominant: string; source: string; timestamp: number;
}) {
  const age = Math.round((Date.now() - timestamp) / 1000);
  const ageLabel = age < 60 ? `${age}s` : `${Math.round(age / 60)}m`;
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-[var(--color-bat-border)] signal-flash">
      <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${sentimentDot(dominant)}`} />
      <p className={`text-xs leading-snug flex-1 ${sentimentColor(dominant)} opacity-80`}>
        {text.slice(0, 120)}{text.length > 120 ? "…" : ""}
      </p>
      <span className="text-[10px] text-[var(--color-bat-dim)] shrink-0 font-mono">
        {source === "rss" ? "RSS" : "BSky"} · {ageLabel}
      </span>
    </div>
  );
});

export default function LiveFeed() {
  const signals = useBatcaveStore((s) => s.signals);
  const topicFilter = useBatcaveStore((s) => s.topicFilter);

  const filtered = useMemo(() => {
    const list = topicFilter === "all"
      ? signals
      : signals.filter((s) => s.topic === topicFilter);
    return list.slice(-40).reverse();
  }, [signals, topicFilter]);

  return (
    <div className="bat-panel p-3 h-full flex flex-col overflow-hidden">
      <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-bat-orange)] font-mono mb-2 hud-glow">
        Live Feed
      </h3>
      <div className="flex-1 overflow-y-auto space-y-0" style={{ maxHeight: "100%" }}>
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--color-bat-dim)] italic">Waiting for signals…</p>
        )}
        {filtered.map((s) => (
          <SignalRow key={s.id} text={s.text} dominant={s.dominant} source={s.source} timestamp={s.timestamp} />
        ))}
      </div>
    </div>
  );
}
