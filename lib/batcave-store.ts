"use client";

import { create } from "zustand";
import type { LiveSignal, LiveAggregate, TopicFilter } from "./live-types";

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

  // Actions
  setConnected: (v: boolean) => void;
  addSignal: (s: LiveSignal) => void;
  setAggregates: (agg: LiveAggregate[]) => void;
  setTotalSignals: (n: number) => void;
  setTopicFilter: (f: TopicFilter) => void;
  setActiveWindow: (w: "30s" | "2min" | "10min") => void;
  toggleBatcaveMode: () => void;
  initFromServer: (signals: LiveSignal[], aggregates: LiveAggregate[], total: number) => void;
}

export const useBatcaveStore = create<BatcaveState>((set, get) => ({
  connected: false,
  signals: [],
  aggregates: [],
  totalSignals: 0,
  topicFilter: "all",
  activeWindow: "2min",
  globalIntensity: 0,
  batcaveMode: false,

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

  toggleBatcaveMode: () => set((s) => ({ batcaveMode: !s.batcaveMode })),

  initFromServer: (signals, aggregates, total) =>
    set({ signals: signals.slice(-200), aggregates, totalSignals: total, connected: true }),
}));
