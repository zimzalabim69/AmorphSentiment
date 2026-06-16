"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function KeyPhrases() {
  const aggregates = useBatcaveStore((s) => s.aggregates);
  const activeWindow = useBatcaveStore((s) => s.activeWindow);

  const phrases = useMemo(() => {
    const agg = aggregates.find((a) => a.window === activeWindow);
    return agg?.topPhrases || [];
  }, [aggregates, activeWindow]);

  return (
    <div className="bat-panel p-3">
      <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-bat-orange)] font-mono mb-2 hud-glow">
        Trending Phrases
      </h3>
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence mode="popLayout">
          {phrases.map((phrase) => (
            <motion.span
              key={phrase}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--color-bat-dark)] border border-[var(--color-bat-border)] text-[var(--color-bat-amber)]"
            >
              {phrase}
            </motion.span>
          ))}
        </AnimatePresence>
        {phrases.length === 0 && (
          <span className="text-[10px] text-[var(--color-bat-dim)] italic">Gathering…</span>
        )}
      </div>
    </div>
  );
}
