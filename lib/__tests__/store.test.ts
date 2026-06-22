import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAppStore } from "../store";

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
  } as Response);
}

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      phase: "idle",
      query: "",
      result: null,
      history: [],
      activePreset: null,
      classicMode: false,
      soundEnabled: false,
      searchMode: false,
      errorMessage: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should set query", () => {
    useAppStore.getState().setQuery("test query");
    expect(useAppStore.getState().query).toBe("test query");
  });

  it("should toggle search mode", () => {
    const state = useAppStore.getState();
    expect(state.searchMode).toBe(false);
    state.toggleSearchMode();
    expect(useAppStore.getState().searchMode).toBe(true);
  });

  it("should reset state", () => {
    useAppStore.setState({ query: "test", phase: "result", errorMessage: "err" });
    useAppStore.getState().reset();
    const s = useAppStore.getState();
    expect(s.query).toBe("");
    expect(s.phase).toBe("idle");
    expect(s.errorMessage).toBeNull();
  });

  it("analyze should call /api/analyze and set result", async () => {
    const mockResult = {
      id: "r1",
      query: "hello",
      scores: { positive: 0.6, negative: 0.2, neutral: 0.2 },
      dominant: "positive" as const,
      polarity: 0.4,
      intensity: 0.7,
      emotions: [],
      keyPhrases: [],
      summary: "Good vibes",
      sampleSize: 1,
      createdAt: Date.now(),
    };
    global.fetch = mockFetch(mockResult);

    useAppStore.getState().setQuery("hello");
    await useAppStore.getState().analyze();

    const state = useAppStore.getState();
    expect(state.phase).toBe("result");
    expect(state.result).toEqual(mockResult);
    expect(state.history).toHaveLength(1);
  });

  it("analyze should handle server errors gracefully", async () => {
    global.fetch = mockFetch({ error: "Ollama timeout" }, 503);

    useAppStore.getState().setQuery("hello");
    await useAppStore.getState().analyze();

    const state = useAppStore.getState();
    expect(state.phase).toBe("error");
    expect(state.errorMessage).toBe("Ollama timeout");
    expect(state.result).toBeNull();
  });

  it("searchAndAnalyze should fallback to direct analysis when no RSS results", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [], fallback: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          id: "r2",
          query: "SpaceX",
          scores: { positive: 0.5, negative: 0.3, neutral: 0.2 },
          dominant: "positive" as const,
          polarity: 0.2,
          intensity: 0.6,
          emotions: [],
          keyPhrases: [],
          summary: "Mixed but leaning positive",
          sampleSize: 1,
          createdAt: Date.now(),
        }),
      } as Response);

    useAppStore.getState().setQuery("SpaceX");
    await useAppStore.getState().searchAndAnalyze();

    const state = useAppStore.getState();
    expect(state.phase).toBe("result");
    expect(state.result?.query).toBe("SpaceX");
    expect(global.fetch).toHaveBeenCalledWith("/api/analyze", expect.any(Object));
  });

  it("should not run analyze if already analyzing", async () => {
    useAppStore.setState({ phase: "analyzing" });
    const spy = vi.fn();
    global.fetch = spy;

    await useAppStore.getState().analyze();
    expect(spy).not.toHaveBeenCalled();
  });

  it("should cap history at 8 items", async () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      query: `q${i}`,
      scores: { positive: 0.5, negative: 0.25, neutral: 0.25 },
      dominant: "neutral" as const,
      polarity: 0,
      intensity: 0.5,
      emotions: [],
      keyPhrases: [],
      summary: "test",
      sampleSize: 1,
      createdAt: Date.now(),
    }));

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(results[0]) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(results[1]) } as Response);

    useAppStore.getState().setQuery("q0");
    await useAppStore.getState().analyze();
    useAppStore.getState().setQuery("q1");
    await useAppStore.getState().analyze();

    expect(useAppStore.getState().history.length).toBeLessThanOrEqual(8);
  });
});
