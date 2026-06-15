"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { playRipple } from "@/lib/sound";

export default function PresetTopics() {
  const presets = useAppStore((s) => s.presets);
  const activePreset = useAppStore((s) => s.activePreset);
  const selectPreset = useAppStore((s) => s.selectPreset);
  const phase = useAppStore((s) => s.phase);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {presets.map((p, i) => {
        const active = activePreset === p.id;
        return (
          <motion.button
            key={p.id}
            type="button"
            disabled={phase === "analyzing"}
            onMouseEnter={() => playRipple()}
            onClick={() => selectPreset(p.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium backdrop-blur-md transition disabled:opacity-50 sm:text-sm"
            style={{
              borderColor: active ? p.accent : "rgba(255,255,255,0.12)",
              background: active ? `${p.accent}22` : "rgba(255,255,255,0.04)",
              color: active ? "#fff" : "rgba(255,255,255,0.7)",
            }}
          >
            <motion.span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: p.accent, boxShadow: `0 0 10px ${p.accent}` }}
              animate={{ scale: active ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 1.6, repeat: active ? Infinity : 0 }}
            />
            {p.label}
          </motion.button>
        );
      })}
    </div>
  );
}
