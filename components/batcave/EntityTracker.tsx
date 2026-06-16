"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_COLORS: Record<string, string> = {
  PERSON: "#a78bfa",
  ORG: "#22c55e",
  GPE: "#06b6d4",
  PRODUCT: "#f59e0b",
  TICKER: "#39ffb0",
  EVENT: "#ff4d6d",
  TECH: "#ec4899",
};

export default function EntityTracker() {
  const aggregates = useBatcaveStore((s) => s.aggregates);
  const activeWindow = useBatcaveStore((s) => s.activeWindow);

  const entities = useMemo(() => {
    const agg = aggregates.find((a) => a.window === activeWindow);
    return agg?.topEntities || [];
  }, [aggregates, activeWindow]);

  return (
    <div className="bat-panel p-3">
      <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-bat-orange)] font-mono mb-2 hud-glow">
        Entity Tracker
      </h3>
      <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {entities.map((e) => (
            <motion.div
              key={`${e.name}-${e.type}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center justify-between text-[10px] font-mono"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[e.type] || "var(--color-bat-dim)" }}
                />
                <span className="text-[var(--color-bat-text)] truncate" title={e.name}>
                  {e.name}
                </span>
                <span
                  className="text-[9px] px-1 rounded border flex-shrink-0"
                  style={{
                    color: TYPE_COLORS[e.type] || "var(--color-bat-dim)",
                    borderColor: `${TYPE_COLORS[e.type] || "var(--color-bat-dim)"}30`,
                    backgroundColor: `${TYPE_COLORS[e.type] || "var(--color-bat-dim)"}10`,
                  }}
                >
                  {e.type}
                </span>
              </div>
              <span className="text-[var(--color-bat-dim)] flex-shrink-0 ml-2">
                {e.mentions}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {entities.length === 0 && (
          <span className="text-[10px] text-[var(--color-bat-dim)] italic">Scanning for entities…</span>
        )}
      </div>
    </div>
  );
}
