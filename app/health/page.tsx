import { checkGroqHealth } from "@/lib/groq";

export const dynamic = "force-dynamic";

interface HealthResult {
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
}

async function runChecks(): Promise<HealthResult[]> {
  const results: HealthResult[] = [];

  // Groq LLM health
  const hasKey = !!process.env.GROQ_API_KEY;
  if (!hasKey) {
    results.push({
      name: "Groq LLM",
      status: "error",
      message: "GROQ_API_KEY not set — get a free key at console.groq.com/keys",
    });
  } else {
    try {
      const groqOk = await checkGroqHealth();
      results.push({
        name: "Groq LLM",
        status: groqOk ? "ok" : "error",
        message: groqOk ? "API key valid, model ready" : "Groq API returned error",
      });
    } catch {
      results.push({ name: "Groq LLM", status: "error", message: "Connection failed" });
    }
  }

  // RSS feeds — check in parallel with timeout
  const { RSS_FEEDS } = await import("@/lib/rss-feeds");
  const rssChecks = await Promise.all(
    RSS_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "AmorphSentiment-Health/1.0" },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      } catch { return false; }
    })
  );
  const rssOk = rssChecks.filter(Boolean).length;
  results.push({
    name: "RSS Feeds",
    status: rssOk >= RSS_FEEDS.length / 2 ? "ok" : rssOk > 0 ? "warn" : "error",
    message: `${rssOk}/${RSS_FEEDS.length} feeds reachable`,
  });

  // Bluesky Jetstream — DNS/connect check (no ws lib in Node env)
  try {
    const res = await fetch("https://jetstream2.us-east.bsky.network/xrpc/_health", {
      signal: AbortSignal.timeout(5000),
    });
    results.push({
      name: "Bluesky Jetstream",
      status: res.ok ? "ok" : "warn",
      message: res.ok ? "Jetstream host reachable" : "Host reachable but returned non-200",
    });
  } catch {
    results.push({ name: "Bluesky Jetstream", status: "error", message: "Host unreachable" });
  }

  return results;
}

export default async function HealthPage() {
  const checks = await runChecks();
  const allOk = checks.every((c) => c.status === "ok");

  return (
    <main className="min-h-screen bg-[var(--color-bat-black)] p-8 text-[var(--color-bat-text)]">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-[var(--color-bat-orange)]">
          System Health
        </h1>

        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm font-mono ${
            allOk
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {allOk ? "✓ All systems operational" : "⚠ Some systems are degraded"}
        </div>

        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between rounded border border-[var(--color-bat-border)] bg-[var(--color-bat-panel)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{check.name}</p>
                <p className="text-xs text-[var(--color-bat-dim)]">{check.message}</p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                  check.status === "ok"
                    ? "bg-green-500/20 text-green-400"
                    : check.status === "warn"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                }`}
              >
                {check.status}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-[var(--color-bat-dim)]">
          Health checks run server-side on page load. Refresh to re-check.
        </p>
      </div>
    </main>
  );
}
