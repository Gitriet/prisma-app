import { auth } from "@/auth";
import { fetchAllFeeds } from "@/lib/rss";

export const maxDuration = 30;

// Stap 1: alleen RSS ophalen — snel (~3-5s)
export async function POST() {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const items = await fetchAllFeeds();
  if (items.length === 0) {
    return new Response(JSON.stringify({ error: "Geen RSS-items opgehaald." }), { status: 502 });
  }

  return new Response(JSON.stringify({ items }), {
    headers: { "Content-Type": "application/json" },
  });
}
