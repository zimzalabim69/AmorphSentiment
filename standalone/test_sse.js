const http = require('http');
const req = http.get('http://localhost:8000/stream', { headers: { 'Accept': 'text/event-stream' } }, (res) => {
  let d = '';
  res.on('data', (c) => {
    d += c;
    const lines = d.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const j = JSON.parse(line.slice(6));
          console.log('SSE:', j.avg_sentiment, j.volume, j.dominant_emotion, j.top_topics.slice(0, 3));
          req.destroy();
          process.exit(0);
        } catch {}
      }
    }
  });
});
req.setTimeout(8000, () => {
  req.destroy();
  console.log('timeout');
  process.exit(1);
});
