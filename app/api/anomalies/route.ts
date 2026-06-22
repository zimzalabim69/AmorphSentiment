import { getRecentAnomalies } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const since = Date.now() - 24 * 60 * 60 * 1000; // last 24h
  const anomalies = getRecentAnomalies(since, 50);
  return Response.json({ anomalies });
}
