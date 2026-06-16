"use client";

import { useBatcaveStore } from "@/lib/batcave-store";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import LockOnReticle from "./LockOnReticle";
import FocusPanels from "./FocusPanels";

const OrganismCanvas = dynamic(() => import("@/components/scene/OrganismCanvas"), {
  ssr: false,
});

export default function HyperFocusView() {
  const hyperFocus = useBatcaveStore((s) => s.hyperFocus);
  const exitHyperFocus = useBatcaveStore((s) => s.exitHyperFocus);

  return (
    <AnimatePresence>
      {hyperFocus.active && (
        <motion.div
          className="fixed inset-0 z-50 bg-[#010104] overflow-hidden"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Scanlines overlay */}
          <div className="batcave-scanlines absolute inset-0 pointer-events-none z-10" />

          {/* Organism fills most of the screen */}
          <div className="absolute inset-0">
            <OrganismCanvas />
          </div>

          {/* Lock-on reticle animation */}
          <LockOnReticle keyword={hyperFocus.keyword} />

          {/* Top bar — keyword + exit */}
          <motion.div
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-bat-red)] animate-pulse" />
              <h2 className="font-mono text-sm font-bold tracking-widest text-[var(--color-bat-orange)] hud-glow uppercase">
                HYPERFOCUS<span className="text-[var(--color-bat-dim)]">::</span>{hyperFocus.keyword}
              </h2>
            </div>
            <button
              onClick={exitHyperFocus}
              className="font-mono text-[10px] px-3 py-1.5 rounded border border-[var(--color-bat-red)] text-[var(--color-bat-red)] hover:bg-[var(--color-bat-red)] hover:text-black transition-all"
            >
              EXIT FOCUS [ESC]
            </button>
          </motion.div>

          {/* Focus panels (bottom/sides) */}
          <FocusPanels />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
