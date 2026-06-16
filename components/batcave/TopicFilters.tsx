"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { TOPIC_FILTERS, type TopicFilter } from "@/lib/live-types";

const filterColors: Record<TopicFilter, string> = {
  all: "var(--color-bat-orange)",
  tech: "#a78bfa",
  geopolitics: "#ef4444",
  markets: "#22c55e",
  science: "#06b6d4",
  memes: "#f59e0b",
  sports: "#3b82f6",
  culture: "#ec4899",
};

export default function TopicFilters() {
  const topicFilter = useBatcaveStore((s) => s.topicFilter);
  const setTopicFilter = useBatcaveStore((s) => s.setTopicFilter);
  const enterHyperFocus = useBatcaveStore((s) => s.enterHyperFocus);

  return (
    <div className="flex flex-wrap gap-1">
      {TOPIC_FILTERS.map((f) => {
        const active = topicFilter === f;
        return (
          <button
            key={f}
            onClick={() => setTopicFilter(f)}
            onDoubleClick={() => { if (f !== "all") enterHyperFocus(f); }}
            className="px-2 py-0.5 text-[9px] font-mono uppercase rounded transition-all border"
            style={{
              borderColor: active ? filterColors[f] : "var(--color-bat-border)",
              color: active ? filterColors[f] : "var(--color-bat-dim)",
              backgroundColor: active ? `${filterColors[f]}15` : "transparent",
            }}
            title={f !== "all" ? "Double-click to HYPERFOCUS" : undefined}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}
