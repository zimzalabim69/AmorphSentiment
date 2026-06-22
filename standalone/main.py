"""
AmorphSentiment Standalone — FastAPI backend with multi-source ingestion,
batched LLM analysis, and SSE streaming.

Run: uvicorn main:app --reload --port 8000
"""

import asyncio
import json
import os
import zlib
from collections import Counter, deque
from datetime import datetime, timedelta
from typing import AsyncGenerator, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from groq import Groq
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, JSON, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found in environment")

app = FastAPI(title="AmorphSentiment Standalone")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Database ----------
engine = create_engine("sqlite:///amorphsentiment_standalone.db", echo=False, connect_args={"check_same_thread": False})
Base = declarative_base()

class Signal(Base):
    __tablename__ = "signals"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source = Column(String)
    text = Column(String)
    sentiment_score = Column(Float)   # -1.0 to 1.0
    dominant_emotion = Column(String)
    topics = Column(JSON)

class AggregateWindow(Base):
    __tablename__ = "windows"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    avg_sentiment = Column(Float)
    volume = Column(Integer)
    dominant_emotion = Column(String)
    top_topics = Column(JSON)

Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

# ---------- Groq Client ----------
client = Groq(api_key=GROQ_API_KEY)

async def analyze_batch(texts: List[str]) -> List[Dict]:
    """Analyze up to 5 texts in a single Groq call with retry on rate limit."""
    if not texts:
        return []

    numbered = "\n".join(f"[{i+1}] {t[:300]}" for i, t in enumerate(texts))
    prompt = f"""Analyze each of the following social posts. Return ONLY a JSON array with one object per post:
[
  {{"sentiment_score": -1.0 to 1.0, "dominant_emotion": "joy|anger|fear|sadness|surprise|disgust|neutral", "key_topics": ["topic1", "topic2"]}},
  ...
]

Posts:
{numbered}

JSON array:"""

    for attempt in range(3):
        try:
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=512,
            )
            raw = completion.choices[0].message.content.strip()
            # Clean markdown wrappers
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

            # Robust JSON extraction: find the first [ ... ] array
            results = None
            try:
                results = json.loads(raw)
            except json.JSONDecodeError:
                # Try to extract first JSON array from the text
                start = raw.find("[")
                end = raw.rfind("]")
                if start != -1 and end != -1 and end > start:
                    try:
                        results = json.loads(raw[start:end+1])
                    except json.JSONDecodeError:
                        pass
                # If no array, try to extract individual objects
                if results is None:
                    objs = []
                    idx = 0
                    while True:
                        start = raw.find("{", idx)
                        if start == -1:
                            break
                        # Try to find matching brace
                        brace_count = 0
                        end = start
                        for j, ch in enumerate(raw[start:], start):
                            if ch == "{":
                                brace_count += 1
                            elif ch == "}":
                                brace_count -= 1
                                if brace_count == 0:
                                    end = j
                                    break
                        if end > start:
                            try:
                                obj = json.loads(raw[start:end+1])
                                if isinstance(obj, dict):
                                    objs.append(obj)
                            except json.JSONDecodeError:
                                pass
                        idx = end + 1 if end > start else start + 1
                    if objs:
                        results = objs

            if isinstance(results, list) and len(results) == len(texts):
                return results
            if isinstance(results, list):
                while len(results) < len(texts):
                    results.append({"sentiment_score": 0.0, "dominant_emotion": "neutral", "key_topics": []})
                return results[:len(texts)]
        except Exception as e:
            err_str = str(e)
            if "rate_limit" in err_str or "429" in err_str:
                wait = (attempt + 1) * 5 + 1
                print(f"[analyze_batch] rate limit, retrying in {wait}s...")
                await asyncio.sleep(wait)
                continue
            print(f"[analyze_batch] error: {e}")
            break

    # Fallback: neutral for all
    return [{"sentiment_score": 0.0, "dominant_emotion": "neutral", "key_topics": []} for _ in texts]

# ---------- Ingestion Queues ----------
BLUESKY_QUEUE: asyncio.Queue[str] = asyncio.Queue()
OTHER_QUEUE: asyncio.Queue[tuple[str, str]] = asyncio.Queue()  # (text, source)
SEEN_IDS: set[str] = set()
MAX_SEEN = 5000

async def jetstream_listener():
    """Connect to Bluesky Jetstream and enqueue texts."""
    import websockets
    uri = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post"
    while True:
        try:
            async with websockets.connect(uri) as ws:
                print("[Jetstream] connected")
                async for message in ws:
                    try:
                        data = json.loads(message)
                        commit = data.get("commit")
                        if not commit or commit.get("collection") != "app.bsky.feed.post":
                            continue
                        record = commit.get("record", {})
                        text = record.get("text", "").strip()
                        if not text or len(text) < 5:
                            continue
                        # Stable dedup (CRC32 is deterministic across runs)
                        digest = zlib.crc32(text.encode("utf-8")) & 0xFFFFFFFF
                        if digest in SEEN_IDS:
                            continue
                        SEEN_IDS.add(digest)
                        if len(SEEN_IDS) > MAX_SEEN:
                            SEEN_IDS.pop()
                        await BLUESKY_QUEUE.put(text)
                    except Exception:
                        continue
        except Exception as e:
            print(f"[Jetstream] disconnected: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)

async def reddit_poller():
    """Poll Reddit hot posts every 2 minutes."""
    import aiohttp
    subs = ["worldnews", "technology", "politics", "science", "sports"]
    while True:
        async with aiohttp.ClientSession() as session:
            for sub in subs:
                try:
                    url = f"https://www.reddit.com/r/{sub}/hot.json?limit=5"
                    async with session.get(url, headers={"User-Agent": "AmorphSentiment/1.0"}, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status != 200:
                            continue
                        data = await resp.json()
                        for child in data.get("data", {}).get("children", []):
                            title = child["data"].get("title", "").strip()
                            if title and len(title) > 10:
                                await OTHER_QUEUE.put((title, "reddit"))
                except Exception:
                    continue
        await asyncio.sleep(120)

async def hn_poller():
    """Poll Hacker News top stories every 2 minutes."""
    import aiohttp
    while True:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get("https://hacker-news.firebaseio.com/v0/topstories.json", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    ids = await resp.json()
                for story_id in ids[:8]:
                    try:
                        async with session.get(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                            story = await resp.json()
                        title = story.get("title", "").strip()
                        if title and len(title) > 10:
                            await OTHER_QUEUE.put((title, "hackernews"))
                    except Exception:
                        continue
        except Exception:
            pass
        await asyncio.sleep(120)

# ---------- Analysis Worker ----------
WINDOW: deque[Dict] = deque(maxlen=500)
WINDOW_LOCK = asyncio.Lock()

async def analysis_worker():
    """Batch-analyze texts from queues and update window."""
    batch: List[tuple[str, str]] = []  # (text, source)
    while True:
        # Collect up to 3 items with 5s timeout
        try:
            text = await asyncio.wait_for(BLUESKY_QUEUE.get(), timeout=2.0)
            batch.append((text, "bluesky"))
        except asyncio.TimeoutError:
            pass

        while not OTHER_QUEUE.empty() and len(batch) < 3:
            text, source = await OTHER_QUEUE.get()
            batch.append((text, source))

        if len(batch) >= 3 or (batch and BLUESKY_QUEUE.empty() and OTHER_QUEUE.empty()):
            texts = [t for t, _ in batch]
            results = await analyze_batch(texts)

            async with WINDOW_LOCK:
                for (text, source), res in zip(batch, results):
                    signal = {
                        "timestamp": datetime.utcnow(),
                        "source": source,
                        "text": text[:300],
                        "sentiment_score": float(res.get("sentiment_score", 0.0)),
                        "dominant_emotion": res.get("dominant_emotion", "neutral"),
                        "topics": res.get("key_topics", []),
                    }
                    WINDOW.append(signal)
                    # Persist to DB
                    try:
                        with SessionLocal() as db:
                            db.add(Signal(
                                source=signal["source"],
                                text=signal["text"],
                                sentiment_score=signal["sentiment_score"],
                                dominant_emotion=signal["dominant_emotion"],
                                topics=json.dumps(signal["topics"]),
                            ))
                            db.commit()
                    except Exception as e:
                        print(f"[DB] write error: {e}")

            batch.clear()
        else:
            await asyncio.sleep(0.5)

# ---------- SSE Stream ----------
async def sentiment_stream() -> AsyncGenerator[str, None]:
    while True:
        async with WINDOW_LOCK:
            if WINDOW:
                scores = [s["sentiment_score"] for s in WINDOW]
                emotions = [s["dominant_emotion"] for s in WINDOW]
                all_topics = []
                for s in WINDOW:
                    all_topics.extend(s.get("topics", []))

                avg_sentiment = sum(scores) / len(scores)
                volume = len(WINDOW)
                # Proper dominant emotion calculation
                emotion_counts = Counter(emotions)
                dominant = emotion_counts.most_common(1)[0][0] if emotion_counts else "neutral"
                top_topics = [t for t, _ in Counter(all_topics).most_common(5)]

                payload = {
                    "avg_sentiment": round(avg_sentiment, 3),
                    "volume": volume,
                    "dominant_emotion": dominant,
                    "top_topics": top_topics,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            else:
                payload = {
                    "avg_sentiment": 0.0,
                    "volume": 0,
                    "dominant_emotion": "neutral",
                    "top_topics": [],
                    "timestamp": datetime.utcnow().isoformat(),
                }

        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(2)

@app.get("/stream")
async def stream():
    return StreamingResponse(sentiment_stream(), media_type="text/event-stream")

@app.get("/api/stats")
async def stats():
    """Return current window stats as JSON (for polling fallback)."""
    async with WINDOW_LOCK:
        if not WINDOW:
            return {"avg_sentiment": 0.0, "volume": 0, "dominant_emotion": "neutral", "top_topics": []}
        scores = [s["sentiment_score"] for s in WINDOW]
        emotions = [s["dominant_emotion"] for s in WINDOW]
        all_topics = []
        for s in WINDOW:
            all_topics.extend(s.get("topics", []))
        return {
            "avg_sentiment": round(sum(scores) / len(scores), 3),
            "volume": len(WINDOW),
            "dominant_emotion": Counter(emotions).most_common(1)[0][0] if emotions else "neutral",
            "top_topics": [t for t, _ in Counter(all_topics).most_common(5)],
        }

# ---------- Frontend ----------
@app.get("/", response_class=HTMLResponse)
async def root():
    with open(os.path.join(os.path.dirname(__file__), "index.html"), "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    asyncio.create_task(jetstream_listener())
    asyncio.create_task(reddit_poller())
    asyncio.create_task(hn_poller())
    asyncio.create_task(analysis_worker())
    print("[Startup] AmorphSentiment Standalone running")
