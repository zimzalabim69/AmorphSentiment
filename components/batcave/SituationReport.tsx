"use client";

import { useBatcaveStore } from "@/lib/batcave-store";

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "text-red-400 border-red-400/40 bg-red-400/10";
    case "high": return "text-amber-400 border-amber-400/40 bg-amber-400/10";
    case "medium": return "text-yellow-300 border-yellow-300/40 bg-yellow-300/10";
    default: return "text-[var(--color-bat-dim)] border-[var(--color-bat-border)]";
  }
}

export default function SituationReport() {
  const report = useBatcaveStore((s) => s.latestReport);
  const anomalies = useBatcaveStore((s) => s.anomalies);
  const connected = useBatcaveStore((s) => s.connected);
  const totalSignals = useBatcaveStore((s) => s.totalSignals);

  const hasEnoughData = totalSignals >= 5;

  return (
    <div className="bat-panel p-3 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-bat-orange)] font-mono hud-glow">
          Situation Report
        </h3>
        {report && (
          <span className="text-[9px] text-[var(--color-bat-dim)] font-mono">
            {Math.round((Date.now() - report.timestamp) / 60_000)}m ago
          </span>
        )}
      </div>

      {report ? (
        <div className="flex flex-col gap-2 mb-3">
          <h4 className="text-sm font-bold text-[var(--color-bat-text)] leading-tight">
            {report.headline}
          </h4>
          <p className="text-xs text-[var(--color-bat-dim)] leading-relaxed">
            {report.summary}
          </p>
          <div className="flex gap-2 flex-wrap">
            {report.topics.map((t: string) => (
              <span
                key={t}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[var(--color-bat-border)] text-[var(--color-bat-cyan)]"
              >
                #{t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-mono px-2 py-0.5 rounded border"
              style={{
                color:
                  report.dominantSentiment === "positive"
                    ? "#39ffb0"
                    : report.dominantSentiment === "negative"
                      ? "#ff3d3d"
                      : "#a0a0a0",
                borderColor:
                  report.dominantSentiment === "positive"
                    ? "rgba(57,255,176,0.3)"
                    : report.dominantSentiment === "negative"
                      ? "rgba(255,61,61,0.3)"
                      : "var(--color-bat-border)",
                backgroundColor:
                  report.dominantSentiment === "positive"
                    ? "rgba(57,255,176,0.08)"
                    : report.dominantSentiment === "negative"
                      ? "rgba(255,61,61,0.08)"
                      : "transparent",
              }}
            >
              {report.dominantSentiment.toUpperCase()} · {Math.round(report.intensity * 100)}%
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 mb-3">
          <p className="text-xs text-[var(--color-bat-dim)] italic">
            {connected && hasEnoughData
              ? "Generating first report…"
              : connected
                ? "Collecting signals…"
                : "Waiting for stream…"}
          </p>
          {connected && hasEnoughData && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-bat-orange)] animate-pulse" />
              <span className="text-[9px] text-[var(--color-bat-dim)] font-mono">
                LLM analyzing {totalSignals} signals
              </span>
            </div>
          )}
        </div>
      )}

      {/* Anomaly Feed */}
      {anomalies.length > 0 && (
        <>
          <div className="w-full h-px bg-[var(--color-bat-border)] my-2" />
          <h4 className="text-[9px] uppercase tracking-wider text-[var(--color-bat-red)] font-mono mb-1">
            Anomalies ({anomalies.length})
          </h4>
          <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: "100%" }}>
            {anomalies.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className={`text-[10px] font-mono px-2 py-1 rounded border truncate ${severityColor(a.severity)}`}
                title={`${a.type} · ${a.target}`}
              >
                <span className="font-bold uppercase">{a.type.replace("_", " ")}</span>
                <span className="mx-1 opacity-50">·</span>
                {a.description}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
