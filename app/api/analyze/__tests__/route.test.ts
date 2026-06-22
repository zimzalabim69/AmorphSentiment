import { describe, it, expect, vi } from "vitest";
import { POST } from "../route";
import * as realSentiment from "@/lib/real-sentiment";

vi.mock("@/lib/real-sentiment", () => ({
  analyzeSentimentReal: vi.fn(),
}));

describe("/api/analyze", () => {
  it("returns 400 when text is missing", async () => {
    const req = new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Text required (min 2 chars)");
  });

  it("returns 400 when text is too short", async () => {
    const req = new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      body: JSON.stringify({ text: "x" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns analysis result on success", async () => {
    const mockResult = {
      id: "r1",
      query: "test",
      scores: { positive: 0.8, negative: 0.1, neutral: 0.1 },
      dominant: "positive" as const,
      polarity: 0.7,
      intensity: 0.9,
      emotions: [{ label: "Joy", value: 0.8 }],
      keyPhrases: [{ text: "Amazing", sentiment: "positive" as const, weight: 0.9 }],
      summary: "Very positive",
      sampleSize: 1,
      createdAt: Date.now(),
    };
    vi.mocked(realSentiment.analyzeSentimentReal).mockResolvedValue(mockResult);

    const req = new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      body: JSON.stringify({ text: "This is amazing and wonderful" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dominant).toBe("positive");
    expect(body.intensity).toBe(0.9);
  });

  it("returns 503 when Ollama fails", async () => {
    vi.mocked(realSentiment.analyzeSentimentReal).mockRejectedValue(new Error("Ollama unreachable"));

    const req = new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      body: JSON.stringify({ text: "Some text to analyze" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Ollama unreachable");
  });
});
