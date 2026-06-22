# AmorphSentiment Standalone

A lightweight, standalone FastAPI + Three.js version of AmorphSentiment. No Next.js, no build step, no npm. Just Python + a browser.

## What's Different from the Full Version

| Feature | Standalone | Full (Next.js) |
|---------|-----------|----------------|
| Stack | FastAPI + raw Three.js | Next.js + React Three Fiber |
| Sources | Bluesky, Reddit, HN | Bluesky, Reddit, HN, RSS, NewsAPI |
| Analysis | Batch Groq (3 per call) | Batch Groq (3 per call) |
| Persistence | SQLAlchemy SQLite | better-sqlite3 with full schema |
| Synthesis | Window avg only | LLM Situation Reports |
| Anomalies | None | Statistical anomaly detection |
| UI | Raw Three.js blob + stat cards | Full Batcave dashboard |
| Build | None (serves `index.html`) | `npm run build` |

## Quick Start

```bash
cd standalone

# Install deps
pip install -r requirements.txt

# Or with uv
uv pip install -r requirements.txt

# Create .env
echo "GROQ_API_KEY=your_key_here" > .env

# Run
uvicorn main:app --reload --port 8000

# Open browser to http://localhost:8000
```

## Architecture

- `main.py` — FastAPI backend with:
  - Bluesky Jetstream WebSocket listener
  - Reddit + Hacker News pollers (every 2 min)
  - Batched Groq analysis worker (3 texts per API call)
  - In-memory rolling window (500 signals, 60s cutoff)
  - SQLite persistence via SQLAlchemy
  - SSE stream at `/stream`
  - Serves `index.html` at `/`

- `index.html` — Three.js frontend with:
  - Icosphere blob with multi-octave vertex deformation
  - Sentiment-driven color (red → cyan → green)
  - Particle field that speeds up with intensity
  - SSE connection with auto-reconnect
  - Stat cards and topic tags

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Serves the Three.js frontend |
| `GET /stream` | SSE live stream (2s updates) |
| `GET /api/stats` | Current window stats as JSON |

## Why This Exists

The full Next.js version is a production-grade intelligence platform. This standalone version is:
- **Faster to spin up** — no npm install, no build step
- **Easier to hack on** — single-file backend, single-file frontend
- **Decoupled** — the backend can be used with any frontend
- **Educational** — shows the core pipeline without framework complexity
