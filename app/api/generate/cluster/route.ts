import { auth } from "@/auth";
import { clusterAndGenerate } from "@/lib/ai-cluster";
import type { RssItem } from "@/lib/rss";

export const maxDuration = 60;

// Stap 2: Claude clustering + herschrijven via SSE streaming
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { items } = await req.json() as { items: RssItem[] };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        send("status", { message: "AI clustert en herschrijft artikelen…" });
        const topics = await clusterAndGenerate(items);
        send("done", { topics });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Onbekende fout" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
