"use client";

import { useEffect, useRef } from "react";
import { useBatcaveStore } from "./batcave-store";
import type { LiveSignal, LiveAggregate } from "./live-types";
import type { AnomalyRecord, SynthesisReport } from "./db";
import { toastWarning } from "@/components/ui/Toasts";

/**
 * Hook that connects to /api/stream SSE and feeds signals into the batcave store.
 * Automatically reconnects on disconnect.
 */
export function useLiveStream() {
  const store = useBatcaveStore();
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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

      es.addEventListener("trending", (e) => {
        if (!e.data) return;
        try {
          const topics = JSON.parse(e.data) as { topic: string; volume: number; velocity: number }[];
          store.setTrendingTopics(topics);
        } catch { /* ignore */ }
      });

      es.addEventListener("anomaly", (e) => {
        if (!e.data) return;
        try {
          const a = JSON.parse(e.data) as AnomalyRecord;
          store.addAnomaly(a);
          const label = a.severity === "critical" ? "⚠ CRITICAL" : a.severity === "high" ? "⚠ HIGH" : "⚠";
          toastWarning(`${label}: ${a.description}`);
        } catch { /* ignore */ }
      });

      es.addEventListener("report", (e) => {
        if (!e.data) return;
        try {
          const r = JSON.parse(e.data) as SynthesisReport;
          store.setLatestReport(r);
        } catch { /* ignore */ }
      });

      es.addEventListener("heartbeat", (e) => {
        if (!e.data) return;
        try {
          const { totalSignals } = JSON.parse(e.data) as { ts: number; totalSignals: number };
          store.setTotalSignals(totalSignals);
        } catch { /* ignore */ }
      });

      es.onopen = () => {
        store.setConnected(true);
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        store.setConnected(false);
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
  }, []);
}
