import { getEntityTimeline, getTopEntities } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const timeline = getEntityTimeline(decoded, since);
  const top = getTopEntities(since, 20);
  return Response.json({ entity: decoded, timeline, topEntities: top });
}
