import { subscribe, getRecentSignals, getAggregates, getTotalSignals } from "@/lib/jetstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initSignals = getRecentSignals(30);
      const initAgg = getAggregates();
      controller.enqueue(
        encoder.encode(`event: init\ndata: ${JSON.stringify({ signals: initSignals, aggregates: initAgg, totalSignals: getTotalSignals() })}\n\n`)
      );

      // Subscribe to live events
      const unsubscribe = subscribe((event, data) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          unsubscribe();
        }
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15_000);

      // Cleanup on cancel
      const origCancel = controller.close.bind(controller);
      void origCancel; // reference
      // ReadableStream cancellation is handled via the pull/cancel mechanism
    },
    cancel() {
      // Connection closed by client — listeners auto-clean via WeakRef or Set removal
    },
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
