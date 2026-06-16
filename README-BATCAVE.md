# BATCAVE :: SENTINEL

Your personal Dark Knight command-center — a living sentiment organism that breathes the pulse of the world in real time.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (Batcave Mode)                                   │
│  ┌──────────┐ ┌─────────────────────┐ ┌──────────────┐  │
│  │ Live Feed│ │   3D Organism       │ │Emotion Radar │  │
│  │ (Left)   │ │   (Center Canvas)   │ │Key Phrases   │  │
│  │          │ │   Full-bleed R3F    │ │Intensity Meter│  │
│  └──────────┘ └─────────────────────┘ └──────────────┘  │
│  └─── Bottom HUD: signals, window, filters ────────────┘│
└──────────────────────────────────────────────────────────┘
        │ SSE (EventSource → /api/stream)
        ▼
┌──────────────────────────────────────────────────────────┐
│  Next.js Server (single process, npm run start)          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Singleton: Jetstream Manager                       │  │
│  │  → WebSocket to Bluesky Jetstream (public, no key) │  │
│  │  → RSS poller (BBC, Reuters, AP, NPR, etc.)       │  │
│  │  → analyzeSentiment() on each post/article        │  │
│  │  → Rolling aggregation (30s / 2min / 10min)       │  │
│  │  → Broadcasts to SSE subscribers                  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
git clone https://github.com/zimzalabim69/AmorphSentiment.git
cd AmorphSentiment
npm install
npm run build
npm run start        # production server on http://localhost:3000
```

Then click the **Batcave** button in the top bar to enter live mode.

> **Dev mode** (`npm run dev`) also works but the production server is recommended for always-on use.

## Requirements

- **Node.js 18+** (20 recommended)
- Internet connection (Bluesky WebSocket + RSS feeds)
- No API keys. No paid services. No accounts.

## What It Connects To

| Source | Protocol | URL |
|--------|----------|-----|
| Bluesky Jetstream | WebSocket (public) | `wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post` |
| BBC World | RSS | `https://feeds.bbci.co.uk/news/world/rss.xml` |
| Reuters | RSS | `https://www.reutersagency.com/feed/` |
| AP News | RSS | `https://rsshub.app/apnews/topics/apf-topnews` |
| NPR | RSS | `https://feeds.npr.org/1001/rss.xml` |
| Al Jazeera | RSS | `https://www.aljazeera.com/xml/rss/all.xml` |
| The Guardian | RSS | `https://www.theguardian.com/world/rss` |
| Ars Technica | RSS | `https://feeds.arstechnica.com/arstechnica/index` |
| Hacker News (50+ pts) | RSS | `https://hnrss.org/newest?points=50` |

All public. No authentication. No rate-limit keys.

## Keyboard Shortcuts (Batcave Mode)

| Key | Action |
|-----|--------|
| `Space` | Force-pulse the organism (manual intensity spike) |
| `←` / `→` | Cycle topic filters |
| `1` / `2` / `3` | Switch time window (30s / 2min / 10min) |
| `M` | Toggle sound |
| `Escape` | Exit Batcave mode |

## Topic Filters

Filter the feed by category — the organism and all panels react:

- **All** — everything
- **Tech** — AI, software, startups, hardware
- **Geopolitics** — wars, elections, diplomacy
- **Markets** — stocks, crypto, economy
- **Science** — research, space, climate
- **Memes** — internet culture, humor
- **Sports** — games, scores, teams
- **Culture** — movies, music, art, viral

## Customization Tips

### Add/Remove RSS Feeds

Edit `lib/rss-feeds.ts`:
```ts
export const RSS_FEEDS = [
  { name: "My Feed", url: "https://example.com/rss.xml" },
  // ...
];
```

### Adjust Topic Keywords

Edit `lib/live-types.ts` → `TOPIC_KEYWORDS` object. Add keywords to existing topics or create new ones.

### Tweak Organism Response

- **Shockwave sensitivity** — In `components/scene/Blob.tsx`, change the `0.2` threshold in the spike detection: `if (globalIntensity - prevIntensity.current > 0.2)`
- **Bloom intensity** — In `components/scene/OrganismCanvas.tsx`, adjust `bloomIntensity` for batcave mode (default: 1.8)
- **Particle speed** — In `components/scene/Particles.tsx`, change the `2.5` multiplier in `speedMult`

### Always-On Deployment (Free)

Run on any always-on machine:
```bash
# Option 1: Your laptop (tmux/screen session)
tmux new -s batcave
npm run start
# Ctrl+B, D to detach

# Option 2: Free Oracle Cloud VM (ARM, 4 cores, 24GB RAM)
# SSH in, clone, npm install, npm run start
# Use PM2 for auto-restart:
npm install -g pm2
pm2 start npm --name batcave -- start
pm2 save
pm2 startup

# Option 3: Railway.app free tier
# Connect repo, set start command: npm run start
```

### CRT Scanlines

The scanline overlay is CSS-only (see `.batcave-scanlines` in `globals.css`). Disable it by removing the class from `BatcaveLayout.tsx`.

## Data Flow

1. Bluesky Jetstream streams every public post in real-time (~thousands/sec)
2. Each post's text runs through the existing `analyzeSentiment()` lexicon engine
3. Results accumulate in rolling windows (30s, 2min, 10min)
4. Aggregates push to the browser via SSE every 5 seconds
5. Individual signals push immediately (throttled by render)
6. The organism's shape, color, speed, and shockwave all derive from live aggregates
7. When the world is calm → peaceful blue drift. When chaos spikes → violent red thrashing.

## Original Demo Mode

The original AmorphSentiment demo (presets, manual text input, classic mode) is still fully intact. Just don't click "Batcave" — everything works exactly as before. The Batcave is a separate full-screen takeover that you enter/exit freely.
