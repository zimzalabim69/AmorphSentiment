"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SENTIMENT_COLORS } from "@/lib/sentiment";
import { useAppStore } from "@/lib/store";
import { playRipple } from "@/lib/sound";

export default function InputOrb() {
  const query = useAppStore((s) => s.query);
  const phase = useAppStore((s) => s.phase);
  const setQuery = useAppStore((s) => s.setQuery);
  const analyze = useAppStore((s) => s.analyze);
  const searchAndAnalyze = useAppStore((s) => s.searchAndAnalyze);
  const searchMode = useAppStore((s) => s.searchMode);
  const toggleSearchMode = useAppStore((s) => s.toggleSearchMode);
  const result = useAppStore((s) => s.result);
  const errorMessage = useAppStore((s) => s.errorMessage);

  const analyzing = phase === "analyzing";
  const isError = phase === "error";
  const palette = SENTIMENT_COLORS[result?.dominant ?? "neutral"];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode) {
      searchAndAnalyze();
    } else {
      analyze();
    }
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <motion.div
        className="group relative rounded-[2rem] border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur-xl"
        animate={{
          boxShadow: analyzing
            ? [
                `0 0 30px ${palette.glow}55`,
                `0 0 60px ${palette.glow}aa`,
                `0 0 30px ${palette.glow}55`,
              ]
            : isError
              ? `0 0 24px rgba(255,61,61,0.3)`
              : `0 0 24px ${palette.glow}33`,
        }}
        transition={{ duration: 1.4, repeat: analyzing ? Infinity : 0, ease: "easeInOut" }}
      >
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit(e);
              }}
              rows={2}
              placeholder={
                searchMode
                  ? "Search a topic and analyze live news… e.g. “SpaceX launch” or “crypto regulation”"
                  : "Feed the organism… paste any text, article, or thoughts to analyze"
              }
              className="max-h-40 min-h-[3.5rem] w-full resize-none rounded-[1.6rem] bg-transparent px-5 py-3.5 text-sm text-white/90 placeholder:text-white/35 focus:outline-none sm:text-base"
            />
          </div>

          <motion.button
            type="submit"
            disabled={analyzing || !query.trim()}
            onMouseEnter={() => playRipple()}
            whileHover={{ scale: analyzing ? 1 : 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="relative mb-1.5 mr-1.5 flex h-12 shrink-0 items-center gap-2 overflow-hidden rounded-full px-5 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
            style={{
              background: isError
                ? `linear-gradient(135deg, #ff3d3d, #ff6b2c)`
                : `linear-gradient(135deg, ${palette.core}, ${palette.glow})`,
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {analyzing ? (
                <motion.span
                  key="analyzing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-2"
                >
                  <PulseDots />
                  Sensing
                </motion.span>
              ) : isError ? (
                <motion.span
                  key="error"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  Retry
                </motion.span>
              ) : (
                <motion.span
                  key="analyze"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  {searchMode ? "Search" : "Analyze"}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      <div className="mt-2 flex items-center justify-between px-2">
        <button
          type="button"
          onClick={toggleSearchMode}
          className="text-[11px] text-white/35 transition hover:text-white/70"
        >
          {searchMode ? "Switch to text analysis" : "Switch to news search"}
        </button>
        <span className="text-[11px] text-white/35">
          {isError && errorMessage ? (
            <span className="text-red-400">{errorMessage}</span>
          ) : (
            `LLM-powered · press ⌘/Ctrl + Enter to submit`
          )}
        </span>
      </div>
    </form>
  );
}

function PulseDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-black/70"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
