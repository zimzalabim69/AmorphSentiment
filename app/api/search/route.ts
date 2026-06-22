import { RSS_FEEDS } from "@/lib/rss-feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchResult {
  title: string;
  description: string;
  source: string;
}

function matchesQuery(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (lowerText.includes(lowerQuery)) return true;
  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 2);
  if (queryWords.length > 1) {
    const matches = queryWords.filter((w) => lowerText.includes(w));
    return matches.length >= Math.ceil(queryWords.length / 2);
  }
  return false;
}

const MAX_QUERY_LEN = 200;

function sanitizeQuery(q: string): string {
  return q
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFeed(
  feed: (typeof RSS_FEEDS)[number],
  query: string,
): Promise<SearchResult[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "AmorphSentiment-Batcave/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
    const found: SearchResult[] = [];

    for (const item of items.slice(0, 8)) {
      const title =
        item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
          ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
          .trim() || "";
      const desc =
        item
          .match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]
          ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
          ?.replace(/<[^>]+>/g, "")
          .trim() || "";

      const text = `${title} ${desc}`;
      if (matchesQuery(text, query)) {
        found.push({ title, description: desc, source: feed.name });
      }
    }
    return found;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q")?.trim();

  if (!raw || raw.length < 2) {
    return Response.json({ error: "Query required (min 2 chars)" }, { status: 400 });
  }

  const query = sanitizeQuery(raw);
  if (query.length > MAX_QUERY_LEN) {
    return Response.json({ error: "Query too long (max 200 chars)" }, { status: 400 });
  }

  // Fetch all feeds in parallel — one slow feed won't block the rest
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchFeed(feed, query))
  );

  const results: SearchResult[] = [];
  for (const r of feedResults) {
    if (r.status === "fulfilled") results.push(...r.value);
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    if (seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  });

  return Response.json({ results: unique.slice(0, 10), fallback: unique.length === 0 });
}
