import { describe, it, expect } from "vitest";
import { useBatcaveStore } from "../batcave-store";

describe("useBatcaveStore", () => {
  beforeEach(() => {
    useBatcaveStore.setState({
      connected: false,
      signals: [],
      aggregates: [],
      totalSignals: 0,
      topicFilter: "all",
      activeWindow: "2min",
      globalIntensity: 0,
      batcaveMode: false,
      hyperFocus: {
        active: false,
        keyword: "",
        focusedSignals: [],
        sentimentHistory: [],
        startedAt: 0,
      },
      trendingTopics: [],
    });
  });

  it("should toggle batcave mode and reset hyperFocus", () => {
    useBatcaveStore.setState({
      hyperFocus: {
        active: true,
        keyword: "crypto",
        focusedSignals: [{ id: "s1" } as { id: string }],
        sentimentHistory: [0.5],
        startedAt: Date.now(),
      },
    });

    useBatcaveStore.getState().toggleBatcaveMode();
    const state = useBatcaveStore.getState();
    expect(state.batcaveMode).toBe(true);
    expect(state.hyperFocus.active).toBe(false);
    expect(state.hyperFocus.keyword).toBe("");
  });

  it("should add signals and cap at 200", () => {
    const store = useBatcaveStore.getState();
    for (let i = 0; i < 250; i++) {
      store.addSignal({
        id: `s${i}`,
        text: `post ${i}`,
        source: "bluesky",
        dominant: "neutral",
        scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
        intensity: 0.5,
        timestamp: Date.now(),
        topic: null,
        topics: [],
        entities: [],
        emotions: [],
        keyPhrases: [],
      });
    }
    expect(useBatcaveStore.getState().signals.length).toBe(200);
    expect(useBatcaveStore.getState().totalSignals).toBe(250);
  });

  it("should update globalIntensity from aggregates", () => {
    useBatcaveStore.getState().setActiveWindow("30s");
    useBatcaveStore.getState().setAggregates([
      { window: "30s", intensity: 0.8, scores: { positive: 0.5, negative: 0.3, neutral: 0.2 }, dominant: "positive", volume: 10, emotions: [], topPhrases: [], topEntities: [], activeTopics: [] },
      { window: "2min", intensity: 0.4, scores: { positive: 0.3, negative: 0.3, neutral: 0.4 }, dominant: "neutral", volume: 20, emotions: [], topPhrases: [], topEntities: [], activeTopics: [] },
    ]);
    expect(useBatcaveStore.getState().globalIntensity).toBe(0.8);
  });

  it("should enter hyperFocus with matching signals", () => {
    const store = useBatcaveStore.getState();
    store.addSignal({
      id: "s1",
      text: "Bitcoin is soaring today",
      source: "bluesky",
      dominant: "positive",
      scores: { positive: 0.8, negative: 0.1, neutral: 0.1 },
      intensity: 0.9,
      timestamp: Date.now(),
      topic: "markets",
      topics: ["crypto", "markets"],
      entities: [{ name: "Bitcoin", type: "TICKER" }],
      emotions: [{ label: "Joy", value: 0.8 }],
      keyPhrases: ["soaring today"],
    });
    store.addSignal({
      id: "s2",
      text: "Nothing special here",
      source: "rss",
      dominant: "neutral",
      scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
      intensity: 0.1,
      timestamp: Date.now(),
      topic: null,
      topics: [],
      entities: [],
      emotions: [],
      keyPhrases: [],
    });

    store.enterHyperFocus("bitcoin");
    const hf = useBatcaveStore.getState().hyperFocus;
    expect(hf.active).toBe(true);
    expect(hf.keyword).toBe("bitcoin");
    expect(hf.focusedSignals.length).toBe(1);
    expect(hf.focusedSignals[0].id).toBe("s1");
  });

  it("should exit hyperFocus and reset state", () => {
    useBatcaveStore.getState().enterHyperFocus("test");
    useBatcaveStore.getState().exitHyperFocus();
    const hf = useBatcaveStore.getState().hyperFocus;
    expect(hf.active).toBe(false);
    expect(hf.keyword).toBe("");
    expect(hf.focusedSignals.length).toBe(0);
  });

  it("should set topic filter", () => {
    useBatcaveStore.getState().setTopicFilter("tech");
    expect(useBatcaveStore.getState().topicFilter).toBe("tech");
  });

  it("should init from server", () => {
    const signals = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      text: `t${i}`,
      source: "bluesky" as const,
      dominant: "neutral" as const,
      scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
      intensity: 0.5,
      timestamp: Date.now(),
      topic: null,
      topics: [],
      entities: [],
      emotions: [],
      keyPhrases: [],
    }));
    useBatcaveStore.getState().initFromServer(signals, [], 100);
    const state = useBatcaveStore.getState();
    expect(state.signals.length).toBe(10);
    expect(state.totalSignals).toBe(100);
    expect(state.connected).toBe(true);
  });
});
