import { auth } from "@/auth";
import { fetchAllFeeds } from "@/lib/rss";
import { clusterAndGenerate } from "@/lib/ai-cluster";

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Stream voortgang via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        send("status", { message: "RSS-feeds ophalen…" });
        const items = await fetchAllFeeds();

        if (items.length === 0) {
          send("error", { message: "Geen RSS-items opgehaald." });
          controller.close();
          return;
        }

        send("status", { message: `${items.length} artikelen geladen. AI clustert…` });
        const topics = await clusterAndGenerate(items);

        send("done", { topics });
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Onbekende fout",
        });
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
