import { describe, it, expect, vi } from "vitest";
import { GET } from "../route";

describe("/api/search", () => {
  it("returns 400 when query is missing", async () => {
    const req = new Request("http://localhost:3000/api/search");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Query required (min 2 chars)");
  });

  it("returns 400 when query is too short", async () => {
    const req = new Request("http://localhost:3000/api/search?q=x");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns empty results when no RSS feeds match", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<rss><channel></channel></rss>"),
    } as Response);

    const req = new Request("http://localhost:3000/api/search?q=xyz12345nonsense");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual([]);
    expect(body.fallback).toBe(true);
  });

  it("returns deduplicated matching results", async () => {
    const xml = `
      <rss><channel>
        <item>
          <title><![CDATA[SpaceX Launches Starship]]></title>
          <description><![CDATA[SpaceX successfully launched its latest rocket]]></description>
        </item>
        <item>
          <title><![CDATA[SpaceX Launches Starship]]></title>
          <description><![CDATA[Duplicate article]]></description>
        </item>
        <item>
          <title><![CDATA[NASA Budget Cuts]]></title>
          <description><![CDATA[Government reduces NASA funding]]></description>
        </item>
      </channel></rss>
    `;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(xml),
    } as Response);

    const req = new Request("http://localhost:3000/api/search?q=spacex");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBe(1);
    expect(body.results[0].title).toBe("SpaceX Launches Starship");
    expect(body.fallback).toBe(false);
  });

  it("handles partial word matching for multi-word queries", async () => {
    const xml = `
      <rss><channel>
        <item>
          <title><![CDATA[Bitcoin Regulation News]]></title>
          <description><![CDATA[New crypto rules announced]]></description>
        </item>
      </channel></rss>
    `;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(xml),
    } as Response);

    const req = new Request("http://localhost:3000/api/search?q=bitcoin regulation");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBe(1);
  });

  it("skips failed feeds gracefully", async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error("Timeout"))
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("<rss><channel><item><title>Test</title><description>Test desc</description></item></channel></rss>"),
      } as Response);

    const req = new Request("http://localhost:3000/api/search?q=test");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
