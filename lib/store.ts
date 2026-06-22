import { create } from "zustand";
import { PRESET_TOPICS } from "./presets";
import type { PresetTopic, SentimentResult } from "./types";
import {
  isSoundEnabled,
  playChime,
  playWhoosh,
  setSoundEnabled,
} from "./sound";
import { toastSuccess, toastError } from "@/components/ui/Toasts";

export type Phase = "idle" | "analyzing" | "result" | "error";

interface AppState {
  phase: Phase;
  query: string;
  result: SentimentResult | null;
  history: SentimentResult[];
  activePreset: string | null;
  classicMode: boolean;
  soundEnabled: boolean;
  presets: PresetTopic[];
  searchMode: boolean;
  errorMessage: string | null;

  setQuery: (q: string) => void;
  selectPreset: (id: string) => void;
  analyze: (input?: string) => void;
  searchAndAnalyze: (input?: string) => void;
  reset: () => void;
  toggleClassicMode: () => void;
  toggleSound: () => void;
  toggleSearchMode: () => void;
}

async function callAnalyze(text: string): Promise<SentimentResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? `Server error ${res.status}`);
  }
  return (await res.json()) as SentimentResult;
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
  searchMode: false,
  errorMessage: null,

  setQuery: (q) => set({ query: q }),

  selectPreset: (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    set({ query: preset.prompt, activePreset: id });
    get().analyze(preset.prompt);
  },

  analyze: async (input) => {
    const text = (input ?? get().query).trim();
    if (!text || get().phase === "analyzing") return;

    if (get().soundEnabled) playWhoosh(0.7);
    set({ phase: "analyzing", query: text, errorMessage: null });

    try {
      const result = await callAnalyze(text);
      set((s) => ({
        phase: "result",
        result,
        history: [result, ...s.history].slice(0, 8),
      }));
      if (get().soundEnabled) playChime(result.dominant);
      toastSuccess(`Analysis complete — ${result.dominant}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      set({ phase: "error", errorMessage: msg });
      toastError(msg);
    }
  },

  searchAndAnalyze: async (input) => {
    const query = (input ?? get().query).trim();
    if (!query || get().phase === "analyzing") return;

    if (get().soundEnabled) playWhoosh(0.7);
    set({ phase: "analyzing", query, errorMessage: null });

    try {
      // Fetch RSS results matching the query
      const searchRes = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = (await searchRes.json()) as { results?: { title: string; description: string }[]; fallback?: boolean };

      const articles = data.results ?? [];
      let textToAnalyze: string;

      if (articles.length === 0 || data.fallback) {
        // No RSS results — fall back to analyzing the query text directly
        textToAnalyze = query;
      } else {
        // Combine article texts into one blob for analysis
        textToAnalyze = articles
          .map((a) => `${a.title}. ${a.description}`)
          .join("\n\n---\n\n")
          .slice(0, 3000);
      }

      const result = await callAnalyze(textToAnalyze);
      const enriched = { ...result, query };

      set((s) => ({
        phase: "result",
        result: enriched,
        history: [enriched, ...s.history].slice(0, 8),
      }));
      if (get().soundEnabled) playChime(result.dominant);
      const sourceLabel = articles.length > 0 && !data.fallback ? `from ${articles.length} articles` : "from query text";
      toastSuccess(`Analysis ${sourceLabel} — ${result.dominant}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search & analysis failed";
      set({ phase: "error", errorMessage: msg });
      toastError(msg);
    }
  },

  reset: () => {
    set({ phase: "idle", result: null, query: "", activePreset: null, errorMessage: null });
  },

  toggleClassicMode: () => set((s) => ({ classicMode: !s.classicMode })),

  toggleSound: () => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    set({ soundEnabled: next });
    if (next) playWhoosh(0.3);
  },

  toggleSearchMode: () => set((s) => ({ searchMode: !s.searchMode })),
}));
