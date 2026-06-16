---
name: testing-batcave
description: Test the AmorphSentiment Batcave mode end-to-end. Use when verifying live data streaming, Batcave UI, keyboard shortcuts, or original demo mode regression.
---

# Testing AmorphSentiment — Batcave Mode

## Prerequisites

- Node.js 18+ installed
- Internet access (for Bluesky WebSocket + RSS feeds)
- No API keys or secrets needed

## Devin Secrets Needed

None — all data sources are public and free.

## Setup

```bash
cd /home/ubuntu/repos/amorphsentiment
npm install
npm run build
npm run start   # production server at http://localhost:3000
```

Note: Use production mode (`npm run start`) rather than dev mode for testing — the SSE endpoint and WebSocket singleton behave more reliably in production.

If port 3000 is busy: `fuser -k 3000/tcp` then retry.

## Testing Flows

### 1. Enter Batcave Mode & Verify Live Data

1. Open http://localhost:3000
2. Click the orange **"Batcave"** button in the top-right of the header
3. Verify:
   - "BATCAVE::SENTINEL" title appears in orange (top-left)
   - "LIVE" green dot in bottom-left HUD
   - Signal counter increments (Bluesky is high-volume: expect 20+ signals/second)
   - Live Feed (left panel) shows posts with "BSky" source labels
   - RSS articles appear with "RSS" labels
   - Emotion Radar (right panel) shows polygon shape
   - Intensity meter shows a percentage

### 2. Topic Filters & Keyboard Shortcuts

While in Batcave mode:
- Click a topic filter (tech, geopolitics, markets, etc.) — button highlights, feed filters
- Press **→** arrow key — cycles to next filter
- Press **←** arrow key — cycles to previous filter
- Press **Space** — force-pulses the organism (visible intensity spike)
- Press **1/2/3** — switches time window (30s / 2min / 10min)
- Press **M** — toggles sound
- Press **Escape** — exits Batcave mode

### 3. Original Demo Mode (Regression)

After exiting Batcave:
- Click a preset (e.g. "City Light Festival")
- Verify: "Sensing..." → results appear (Positive 88%, Joy=100)
- Organism turns green/blooming
- "Batcave" button still visible in top bar

## Known Behaviors

- **Bluesky volume**: The Jetstream is extremely high-volume (~25 posts/sec). Signal counter will reach thousands quickly.
- **Topic filtering**: Uses keyword matching (not ML). Some posts may seem miscategorized — this is expected behavior for a lexicon-based approach.
- **Trending Phrases**: May show emoji blocks or non-Latin characters when processing multilingual posts — cosmetic, not a bug.
- **RSS**: Polls every 2 minutes. On first load, RSS articles may take up to 2 min to appear (Bluesky data streams immediately).
- **Shockwave effect**: Only visible when intensity spikes rapidly (press Space to trigger manually). The organism surface gets brighter and more turbulent for ~0.5s.

## Architecture Quick Reference

- Backend singleton: `lib/jetstream.ts` (WebSocket + RSS + aggregation)
- SSE endpoint: `app/api/stream/route.ts`
- Frontend state: `lib/batcave-store.ts` (Zustand)
- SSE hook: `lib/use-stream.ts`
- UI components: `components/batcave/`
- Shader uniforms: `uShockwave`, `uGlobalIntensity` in `components/scene/blobShader.ts`
