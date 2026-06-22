/**
 * Multi-source data poller — Reddit + Hacker News + optional NewsAPI.
 * Fetches current hot content and feeds it into the sentiment worker queue.
 * All APIs used here are free and require no authentication.
 */

import { queueText } from "./sentiment-worker";

// ---------- Reddit ----------

const REDDIT_SUBS = [
  "worldnews",
  "technology",
  "politics",
  "news",
  "stocks",
  "science",
  "sports",
  "movies",
  "music",
];

let redditInterval: ReturnType<typeof setInterval> | null = null;
const seenReddit = new Set<string>();

export function startRedditPolling() {
  if (redditInterval) return;
  pollReddit();
  redditInterval = setInterval(pollReddit, 120_000); // every 2 min
}

export function stopRedditPolling() {
  if (redditInterval) {
    clearInterval(redditInterval);
    redditInterval = null;
  }
}

async function pollReddit() {
  const jobs = REDDIT_SUBS.map(async (sub) => {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot/.json?limit=8`, {
        headers: { "User-Agent": "Sentinel/1.0" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        data?: { children?: { data?: { title?: string; selftext?: string; permalink?: string } }[] };
      };
      const posts = data.data?.children ?? [];
      for (const post of posts) {
        const p = post.data;
        if (!p) continue;
        const text = `${p.title ?? ""} ${p.selftext ?? ""}`.trim().slice(0, 300);
        if (text.length < 10) continue;
        const id = `reddit-${sub}-${p.title?.slice(0, 40) ?? ""}`;
        if (seenReddit.has(id)) continue;
        seenReddit.add(id);
        if (seenReddit.size > 2000) {
          const first = seenReddit.values().next().value;
          if (first) seenReddit.delete(first);
        }
        queueText(text, "reddit");
      }
    } catch {
      /* skip failed subreddit */
    }
  });
  await Promise.allSettled(jobs);
}

// ---------- Hacker News ----------

let hnInterval: ReturnType<typeof setInterval> | null = null;
const seenHn = new Set<number>();

export function startHnPolling() {
  if (hnInterval) return;
  pollHn();
  hnInterval = setInterval(pollHn, 120_000); // every 2 min
}

export function stopHnPolling() {
  if (hnInterval) {
    clearInterval(hnInterval);
    hnInterval = null;
  }
}

async function pollHn() {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return;
    const ids = (await res.json()) as number[];
    const topIds = ids.slice(0, 15).filter((id) => !seenHn.has(id));
    if (topIds.length === 0) return;

    const stories = await Promise.allSettled(
      topIds.map(async (id) => {
        const s = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(5_000),
        });
        if (!s.ok) return null;
        return (await s.json()) as { title?: string; text?: string; url?: string; type?: string } | null;
      })
    );

    for (let i = 0; i < topIds.length; i++) {
      const id = topIds[i];
      const story = stories[i];
      if (story.status !== "fulfilled" || !story.value || story.value.type !== "story") continue;
      seenHn.add(id);
      if (seenHn.size > 2000) {
        const first = seenHn.values().next().value;
        if (first !== undefined) seenHn.delete(first);
      }
      const text = `${story.value.title ?? ""} ${story.value.text ?? ""}`.trim().slice(0, 300);
      if (text.length < 10) continue;
      queueText(text, "hackernews");
    }
  } catch {
    /* skip HN failure */
  }
}

// ---------- NewsAPI (optional, needs key) ----------

const NEWSAPI_KEY = process.env.NEWSAPI_KEY ?? "";
let newsInterval: ReturnType<typeof setInterval> | null = null;
const seenNews = new Set<string>();

export function startNewsApiPolling() {
  if (newsInterval || NEWSAPI_KEY.length === 0) return;
  pollNewsApi();
  newsInterval = setInterval(pollNewsApi, 300_000); // every 5 min (rate limited)
}

export function stopNewsApiPolling() {
  if (newsInterval) {
    clearInterval(newsInterval);
    newsInterval = null;
  }
}

async function pollNewsApi() {
  try {
    const res = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=20&apiKey=${NEWSAPI_KEY}`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      articles?: { title?: string; description?: string; url?: string }[];
    };
    const articles = data.articles ?? [];
    for (const article of articles) {
      const text = `${article.title ?? ""} ${article.description ?? ""}`.trim().slice(0, 300);
      if (text.length < 10) continue;
      const id = `newsapi-${article.title?.slice(0, 40) ?? ""}`;
      if (seenNews.has(id)) continue;
      seenNews.add(id);
      if (seenNews.size > 2000) {
        const first = seenNews.values().next().value;
        if (first) seenNews.delete(first);
      }
      queueText(text, "newsapi");
    }
  } catch {
    /* skip NewsAPI failure */
  }
}

// ---------- Trending detection ----------

interface TrendingItem {
  topic: string;
  volume: number;
  avgIntensity: number;
  velocity: number; // signals per minute in last window
}

const topicHistory = new Map<string, { volumes: number[]; timestamps: number[] }>();
const HISTORY_WINDOW_MS = 10 * 60_000; // 10 min

/** Detect what's trending based on recent signals */
export function detectTrending(signals: { topics: string[]; intensity: number; timestamp: number }[]): TrendingItem[] {
  const now = Date.now();

  // Count topics in this batch
  const counts = new Map<string, { count: number; intensitySum: number }>();
  for (const s of signals) {
    for (const t of s.topics) {
      const existing = counts.get(t) ?? { count: 0, intensitySum: 0 };
      existing.count += 1;
      existing.intensitySum += s.intensity;
      counts.set(t, existing);
    }
  }

  // Update history
  for (const [topic, { count }] of counts) {
    const hist = topicHistory.get(topic) ?? { volumes: [], timestamps: [] };
    hist.volumes.push(count);
    hist.timestamps.push(now);
    // Prune old entries
    while (hist.timestamps.length > 0 && hist.timestamps[0] < now - HISTORY_WINDOW_MS) {
      hist.timestamps.shift();
      hist.volumes.shift();
    }
    topicHistory.set(topic, hist);
  }

  // Also prune topics with no recent activity
  for (const [topic, hist] of topicHistory) {
    if (hist.timestamps.length > 0 && hist.timestamps[0] < now - HISTORY_WINDOW_MS) {
      topicHistory.delete(topic);
    }
  }

  // Build trending list
  const results: TrendingItem[] = [];
  for (const [topic, hist] of topicHistory) {
    const totalVolume = hist.volumes.reduce((a, b) => a + b, 0);
    if (totalVolume < 2) continue; // need at least 2 mentions
    const timeSpanMin = Math.max(1, (now - hist.timestamps[0]) / 60_000);
    const velocity = totalVolume / timeSpanMin;
    const avgIntensity = hist.volumes.reduce((a, b) => a + b * (counts.get(topic)?.intensitySum ?? 0.5), 0) / totalVolume;
    results.push({ topic, volume: totalVolume, avgIntensity: Math.min(1, avgIntensity), velocity: Math.round(velocity * 10) / 10 });
  }

  return results.sort((a, b) => b.velocity - a.velocity).slice(0, 10);
}
