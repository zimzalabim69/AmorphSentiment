"use client";

import { create } from "zustand";
import type { LiveSignal, LiveAggregate, TopicFilter } from "./live-types";
import type { AnomalyRecord, SynthesisReport } from "./db";

interface HyperFocusState {
  active: boolean;
  keyword: string;
  focusedSignals: LiveSignal[];
  sentimentHistory: number[];
  startedAt: number;
}

interface TrendingTopic {
  topic: string;
  volume: number;
  velocity: number;
}

interface BatcaveState {
  connected: boolean;
  signals: LiveSignal[];
  aggregates: LiveAggregate[];
  totalSignals: number;
  topicFilter: TopicFilter;
  activeWindow: "30s" | "2min" | "10min";
  globalIntensity: number;
  batcaveMode: boolean;
  hyperFocus: HyperFocusState;
  trendingTopics: TrendingTopic[];
  anomalies: AnomalyRecord[];
  latestReport: SynthesisReport | null;

  setConnected: (v: boolean) => void;
  addSignal: (s: LiveSignal) => void;
  setAggregates: (agg: LiveAggregate[]) => void;
  setTotalSignals: (n: number) => void;
  setTopicFilter: (f: TopicFilter) => void;
  setActiveWindow: (w: "30s" | "2min" | "10min") => void;
  toggleBatcaveMode: () => void;
  initFromServer: (signals: LiveSignal[], aggregates: LiveAggregate[], total: number) => void;
  enterHyperFocus: (keyword: string) => void;
  exitHyperFocus: () => void;
  setTrendingTopics: (topics: TrendingTopic[]) => void;
  addAnomaly: (a: AnomalyRecord) => void;
  setLatestReport: (r: SynthesisReport) => void;
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
  batcaveMode: true,
  hyperFocus: DEFAULT_HYPERFOCUS,
  trendingTopics: [],
  anomalies: [],
  latestReport: null,

  setConnected: (v) => set({ connected: v }),

  addSignal: (s) => {
    set((state) => {
      const next = [...state.signals, s].slice(-200);
      return { signals: next, totalSignals: state.totalSignals + 1 };
    });
    const recent = get().signals.slice(-20);
    const avgIntensity = recent.reduce((sum, sig) => sum + sig.intensity, 0) / Math.max(recent.length, 1);
    set({ globalIntensity: avgIntensity });

    const { hyperFocus } = get();
    if (hyperFocus.active && hyperFocus.keyword) {
      const kw = hyperFocus.keyword.toLowerCase();
      const matches =
        s.text.toLowerCase().includes(kw) ||
        s.topic?.toLowerCase() === kw ||
        s.topics.some((t) => t.toLowerCase() === kw) ||
        s.entities.some((e) => e.name.toLowerCase() === kw || e.type.toLowerCase() === kw) ||
        s.keyPhrases.some((p) => p.toLowerCase().includes(kw));
      if (matches) {
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
    const matching = signals.filter((s) => {
      const matchesText = s.text.toLowerCase().includes(kw);
      const matchesTopic = s.topic?.toLowerCase() === kw;
      const matchesTopics = s.topics.some((t) => t.toLowerCase() === kw);
      const matchesEntities = s.entities.some((e) => e.name.toLowerCase() === kw || e.type.toLowerCase() === kw);
      const matchesPhrases = s.keyPhrases.some((p) => p.toLowerCase().includes(kw));
      return matchesText || matchesTopic || matchesTopics || matchesEntities || matchesPhrases;
    });
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

  setTrendingTopics: (topics) => set({ trendingTopics: topics }),

  addAnomaly: (a) => set((state) => ({ anomalies: [a, ...state.anomalies].slice(0, 50) })),

  setLatestReport: (r) => set({ latestReport: r }),
}));
