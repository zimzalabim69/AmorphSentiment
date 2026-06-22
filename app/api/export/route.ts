import { getSignalsSince, getRecentReports, getRecentAnomalies } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Export API — download raw signals, reports, or anomalies as JSON.
 * Query params:
 *   ?type=signals|reports|anomalies
 *   ?since=(timestamp ms, default 24h ago)
 *   ?format=json|csv (default json)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "signals";
  const since = parseInt(searchParams.get("since") ?? String(Date.now() - 24 * 60 * 60 * 1000), 10);
  const format = searchParams.get("format") ?? "json";

  let data: unknown;

  switch (type) {
    case "signals":
      data = getSignalsSince(since, 2000);
      break;
    case "reports":
      data = getRecentReports(50);
      break;
    case "anomalies":
      data = getRecentAnomalies(since, 200);
      break;
    default:
      return Response.json({ error: "Invalid type. Use signals, reports, or anomalies." }, { status: 400 });
  }

  if (format === "csv" && Array.isArray(data)) {
    const csv = toCsv(data);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="amorph_${type}.csv"`,
      },
    });
  }

  return Response.json({ type, since: new Date(since).toISOString(), count: Array.isArray(data) ? data.length : 0, data });
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const lines = rows.map((row) =>
    keys.map((k) => {
      const v = row[k];
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      // Escape quotes and wrap in quotes if needed
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(",")
  );
  return [header, ...lines].join("\n");
}
