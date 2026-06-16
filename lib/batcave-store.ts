"use client";

import { create } from "zustand";
import type { LiveSignal, LiveAggregate, TopicFilter } from "./live-types";

interface HyperFocusState {
  /** Whether hyper-focus is active */
  active: boolean;
  /** The keyword/topic being focused on (custom or preset) */
  keyword: string;
  /** Signals matching the focused keyword */
  focusedSignals: LiveSignal[];
  /** Sentiment history for sparkline (last 50 intensity readings) */
  sentimentHistory: number[];
  /** Timestamp when focus started */
  startedAt: number;
}

interface BatcaveState {
  /** Whether the live stream is connected */
  connected: boolean;
  /** Recent signals (capped at 200 for frontend) */
  signals: LiveSignal[];
  /** Rolling aggregates [30s, 2min, 10min] */
  aggregates: LiveAggregate[];
  /** Total signals processed since daemon started */
  totalSignals: number;
  /** Active topic filter */
  topicFilter: TopicFilter;
  /** Active time window for display */
  activeWindow: "30s" | "2min" | "10min";
  /** Global intensity (derived from live aggregates) */
  globalIntensity: number;
  /** Whether batcave (live) mode is active */
  batcaveMode: boolean;
  /** HyperFocus state */
  hyperFocus: HyperFocusState;

  // Actions
  setConnected: (v: boolean) => void;
  addSignal: (s: LiveSignal) => void;
  setAggregates: (agg: LiveAggregate[]) => void;
  setTotalSignals: (n: number) => void;
  setTopicFilter: (f: TopicFilter) => void;
  setActiveWindow: (w: "30s" | "2min" | "10min") => void;
  toggleBatcaveMode: () => void;
  initFromServer: (signals: LiveSignal[], aggregates: LiveAggregate[], total: number) => void;
  /** Enter hyper-focus on a keyword */
  enterHyperFocus: (keyword: string) => void;
  /** Exit hyper-focus */
  exitHyperFocus: () => void;
}

const DEFAULT_HYPERFOCUS: HyperFocusState = {
  active: false,
  keyword: "",
  focusedSignals: [],
  sentimentHistory: [],
  startedAt: 0,
};

export const useBatcaveStore = create<BatcaveState>((set, get) => ({
  connected: false,
  signals: [],
  aggregates: [],
  totalSignals: 0,
  topicFilter: "all",
  activeWindow: "2min",
  globalIntensity: 0,
  batcaveMode: false,
  hyperFocus: DEFAULT_HYPERFOCUS,

  setConnected: (v) => set({ connected: v }),

  addSignal: (s) => {
    set((state) => {
      const next = [...state.signals, s].slice(-200);
      return { signals: next, totalSignals: state.totalSignals + 1 };
    });
    // Update global intensity from recent burst
    const recent = get().signals.slice(-20);
    const avgIntensity = recent.reduce((sum, sig) => sum + sig.intensity, 0) / Math.max(recent.length, 1);
    set({ globalIntensity: avgIntensity });

    // If hyper-focus is active, check if signal matches the keyword
    const { hyperFocus } = get();
    if (hyperFocus.active && hyperFocus.keyword) {
      const kw = hyperFocus.keyword.toLowerCase();
      if (s.text.toLowerCase().includes(kw) || s.topic === kw) {
        set((state) => ({
          hyperFocus: {
            ...state.hyperFocus,
            focusedSignals: [...state.hyperFocus.focusedSignals, s].slice(-100),
            sentimentHistory: [...state.hyperFocus.sentimentHistory, s.intensity].slice(-50),
          },
        }));
      }
    }
  },

  setAggregates: (agg) => {
    set({ aggregates: agg });
    // Derive global intensity from active window
    const { activeWindow } = get();
    const active = agg.find((a) => a.window === activeWindow);
    if (active) set({ globalIntensity: active.intensity });
  },

  setTotalSignals: (n) => set({ totalSignals: n }),

  setTopicFilter: (f) => set({ topicFilter: f }),

  setActiveWindow: (w) => set({ activeWindow: w }),

  toggleBatcaveMode: () => set((s) => ({ batcaveMode: !s.batcaveMode, hyperFocus: DEFAULT_HYPERFOCUS })),

  initFromServer: (signals, aggregates, total) =>
    set({ signals: signals.slice(-200), aggregates, totalSignals: total, connected: true }),

  enterHyperFocus: (keyword) => {
    const { signals } = get();
    const kw = keyword.toLowerCase();
    const matching = signals.filter(
      (s) => s.text.toLowerCase().includes(kw) || s.topic === kw,
    );
    set({
      hyperFocus: {
        active: true,
        keyword,
        focusedSignals: matching.slice(-100),
        sentimentHistory: matching.slice(-50).map((s) => s.intensity),
        startedAt: Date.now(),
      },
    });
  },

  exitHyperFocus: () => set({ hyperFocus: DEFAULT_HYPERFOCUS }),
}));
