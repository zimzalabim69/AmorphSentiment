"use client";

import { useEffect, useRef } from "react";
import { useBatcaveStore } from "./batcave-store";
import type { LiveSignal, LiveAggregate } from "./live-types";

/**
 * Hook that connects to /api/stream SSE and feeds signals into the batcave store.
 * Automatically reconnects on disconnect.
 */
export function useLiveStream() {
  const store = useBatcaveStore();
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!store.batcaveMode) {
      // Close existing connection if mode turned off
      esRef.current?.close();
      esRef.current = null;
      store.setConnected(false);
      return;
    }

    function connect() {
      const es = new EventSource("/api/stream");
      esRef.current = es;

      es.addEventListener("init", (e) => {
        const { signals, aggregates, totalSignals } = JSON.parse(e.data) as {
          signals: LiveSignal[];
          aggregates: LiveAggregate[];
          totalSignals: number;
        };
        store.initFromServer(signals, aggregates, totalSignals);
      });

      es.addEventListener("signal", (e) => {
        const signal = JSON.parse(e.data) as LiveSignal;
        store.addSignal(signal);
      });

      es.addEventListener("aggregate", (e) => {
        const agg = JSON.parse(e.data) as LiveAggregate[];
        store.setAggregates(agg);
      });

      es.addEventListener("heartbeat", (e) => {
        const { totalSignals } = JSON.parse(e.data) as { ts: number; totalSignals: number };
        store.setTotalSignals(totalSignals);
      });

      es.onopen = () => {
        store.setConnected(true);
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        store.setConnected(false);
        // Reconnect after 3s
        reconnectRef.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.batcaveMode]);
}
