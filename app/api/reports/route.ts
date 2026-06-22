import { getRecentReports } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const reports = getRecentReports(10);
  return Response.json({ reports });
}
