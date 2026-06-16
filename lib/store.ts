import { create } from "zustand";
import { analyzeSentiment } from "./sentiment";
import { PRESET_TOPICS } from "./presets";
import type { PresetTopic, SentimentResult } from "./types";
import {
  isSoundEnabled,
  playChime,
  playWhoosh,
  setSoundEnabled,
} from "./sound";

export type Phase = "idle" | "analyzing" | "result";

interface AppState {
  phase: Phase;
  query: string;
  result: SentimentResult | null;
  history: SentimentResult[];
  activePreset: string | null;
  classicMode: boolean;
  soundEnabled: boolean;
  presets: PresetTopic[];

  setQuery: (q: string) => void;
  selectPreset: (id: string) => void;
  analyze: (input?: string) => void;
  reset: () => void;
  toggleClassicMode: () => void;
  toggleSound: () => void;
}

const ANALYZE_MS = 1900;

let analyzeTimer: ReturnType<typeof setTimeout> | null = null;

function clearAnalyzeTimer() {
  if (analyzeTimer !== null) {
    clearTimeout(analyzeTimer);
    analyzeTimer = null;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  phase: "idle",
  query: "",
  result: null,
  history: [],
  activePreset: null,
  classicMode: false,
  soundEnabled: false,
  presets: PRESET_TOPICS,

  setQuery: (q) => set({ query: q }),

  selectPreset: (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    set({ query: preset.prompt, activePreset: id });
    get().analyze(preset.prompt);
  },

  analyze: (input) => {
    const text = (input ?? get().query).trim();
    if (!text || get().phase === "analyzing") return;

    if (get().soundEnabled) playWhoosh(0.7);
    clearAnalyzeTimer();
    set({ phase: "analyzing", query: text });

    analyzeTimer = setTimeout(() => {
      analyzeTimer = null;
      const result = analyzeSentiment(text);
      set((s) => ({
        phase: "result",
        result,
        history: [result, ...s.history].slice(0, 8),
      }));
      if (get().soundEnabled) playChime(result.dominant);
    }, ANALYZE_MS);
  },

  reset: () => {
    clearAnalyzeTimer();
    set({ phase: "idle", result: null, query: "", activePreset: null });
  },

  toggleClassicMode: () => set((s) => ({ classicMode: !s.classicMode })),

  toggleSound: () => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    set({ soundEnabled: next });
    if (next) playWhoosh(0.3);
  },
}));
