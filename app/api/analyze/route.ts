import { analyzeSentimentReal } from "@/lib/real-sentiment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { text } = (await request.json()) as { text?: string };

    if (!text || typeof text !== "string" || text.trim().length < 2) {
      return Response.json({ error: "Text required (min 2 chars)" }, { status: 400 });
    }

    const trimmed = text.trim().slice(0, 3000);
    const result = await analyzeSentimentReal(trimmed);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return Response.json({ error: msg }, { status: 503 });
  }
}
