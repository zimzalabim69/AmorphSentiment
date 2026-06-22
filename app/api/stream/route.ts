import { subscribe, getRecentSignals, getAggregates, getTotalSignals } from "@/lib/jetstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let unsubscribe: (() => void) | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let closed = false;

      function cleanup() {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) {
          try { unsubscribe(); } catch { /* noop */ }
          unsubscribe = null;
        }
      }

      try {
        const initSignals = getRecentSignals(30);
        const initAgg = getAggregates();
        controller.enqueue(
          encoder.encode(`event: init\ndata: ${JSON.stringify({ signals: initSignals, aggregates: initAgg, totalSignals: getTotalSignals() })}\n\n`)
        );
      } catch {
        cleanup();
        return;
      }

      try {
        unsubscribe = await subscribe((event, data) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            cleanup();
          }
        });
      } catch {
        cleanup();
        return;
      }

      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      }, 15_000);
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
