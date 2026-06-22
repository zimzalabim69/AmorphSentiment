import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyzeBatch, analyzeOne, checkGroqHealth } from "../groq";

describe("groq client", () => {
  const ORIGINAL_KEY = process.env.GROQ_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GROQ_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = ORIGINAL_KEY;
  });

  it("checkGroqHealth returns true when API responds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    const result = await checkGroqHealth();
    expect(result).toBe(true);
  });

  it("checkGroqHealth returns false on 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    const result = await checkGroqHealth();
    expect(result).toBe(false);
  });

  it("checkGroqHealth returns false on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
    const result = await checkGroqHealth();
    expect(result).toBe(false);
  });

  it("analyzeBatch parses valid JSON from Groq response", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    sentiment: "positive",
                    scores: { positive: 0.8, negative: 0.1, neutral: 0.1 },
                    intensity: 0.7,
                    emotions: [{ label: "Joy", value: 0.9 }],
                    entities: [{ name: "Apple", type: "ORG" }],
                    key_phrases: ["great product"],
                    topics: ["tech"],
                  },
                ]),
              },
            },
          ],
        }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse as Response);

    const results = await analyzeBatch(["Apple released a great product"]);
    expect(results).toHaveLength(1);
    expect(results[0].sentiment).toBe("positive");
    expect(results[0].scores.positive).toBe(0.8);
    expect(results[0].entities[0].name).toBe("Apple");
  });

  it("analyzeBatch handles markdown-wrapped JSON", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content:
                  "```json\n" +
                  JSON.stringify([
                    {
                      sentiment: "neutral",
                      scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
                      intensity: 0.3,
                      emotions: [],
                      entities: [],
                      key_phrases: [],
                      topics: [],
                    },
                  ]) +
                  "\n```",
              },
            },
          ],
        }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse as Response);

    const results = await analyzeBatch(["boring text"]);
    expect(results[0].sentiment).toBe("neutral");
  });

  it("analyzeBatch returns fallback on malformed JSON", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "not json at all" } }],
        }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse as Response);

    const results = await analyzeBatch(["test"]);
    expect(results[0].sentiment).toBe("neutral");
    expect(results[0].scores.positive).toBe(0.33);
  });

  it("analyzeBatch throws on HTTP error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal server error"),
    } as Response);

    await expect(analyzeBatch(["test"])).rejects.toThrow("Groq error 500");
  });

  it("analyzeOne wraps analyzeBatch", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    sentiment: "negative",
                    scores: { positive: 0.1, negative: 0.8, neutral: 0.1 },
                    intensity: 0.9,
                    emotions: [{ label: "Anger", value: 0.8 }],
                    entities: [],
                    key_phrases: ["terrible service"],
                    topics: ["customer support"],
                  },
                ]),
              },
            },
          ],
        }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse as Response);

    const result = await analyzeOne("terrible service experience");
    expect(result.sentiment).toBe("negative");
    expect(result.intensity).toBe(0.9);
  });

  it("normalizes and clamps scores", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    sentiment: "positive",
                    scores: { positive: 2.0, negative: -0.5, neutral: 0.5 },
                    intensity: 1.5,
                    emotions: [{ label: "Joy", value: 5 }],
                    entities: [{ name: "  Test Corp  ", type: "  org  " }],
                    key_phrases: ["phrase"],
                    topics: ["topic"],
                  },
                ]),
              },
            },
          ],
        }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse as Response);

    const result = await analyzeOne("test");
    expect(result.scores.positive).toBeLessThanOrEqual(1);
    expect(result.scores.negative).toBeGreaterThanOrEqual(0);
    expect(result.intensity).toBe(1);
    expect(result.entities[0].name).toBe("Test Corp");
    expect(result.entities[0].type).toBe("ORG");
  });
});
