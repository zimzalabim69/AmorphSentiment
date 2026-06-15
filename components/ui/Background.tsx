"use client";

import { motion } from "framer-motion";
import { SENTIMENT_COLORS } from "@/lib/sentiment";
import { useAppStore } from "@/lib/store";

/**
 * Soft, breathing bioluminescent gradient field rendered behind everything.
 * Pure 2D (CSS + framer-motion) so it works even in classic mode and on
 * devices where WebGL is disabled.
 */
export default function Background() {
  const result = useAppStore((s) => s.result);
  const palette = SENTIMENT_COLORS[result?.dominant ?? "neutral"];

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#03040a]">
      <motion.div
        className="absolute -left-1/4 top-[-10%] h-[60vmax] w-[60vmax] rounded-full blur-[120px]"
        style={{ background: `radial-gradient(circle, ${palette.glow}33, transparent 70%)` }}
        animate={{ scale: [1, 1.18, 1], x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 bottom-[-15%] h-[55vmax] w-[55vmax] rounded-full blur-[120px]"
        style={{ background: `radial-gradient(circle, ${palette.accent}2e, transparent 70%)` }}
        animate={{ scale: [1.1, 1, 1.1], x: [0, -30, 0], y: [0, -25, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[40vmax] w-[40vmax] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
        style={{ background: `radial-gradient(circle, ${palette.core}22, transparent 70%)` }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* faint grain / vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#03040a_100%)]" />
    </div>
  );
}
