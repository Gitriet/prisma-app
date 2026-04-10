import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchAllFeeds } from "@/lib/rss";

export const maxDuration = 30;

// Geeft gecachte RSS-items terug. Als de cache leeg is, haalt het live op als fallback.
export async function POST() {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const cached = await prisma.rssCache.findMany({
    orderBy: { fetchedAt: "desc" },
  });

  if (cached.length > 0) {
    const items = cached.map((c) => ({
      source: c.source,
      title: c.title,
      summary: c.summary,
      link: c.link,
      pubDate: c.pubDate,
    }));
    return new Response(JSON.stringify({ items, fromCache: true, count: items.length }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fallback: live ophalen als cache nog leeg is
  const items = await fetchAllFeeds();
  return new Response(JSON.stringify({ items, fromCache: false, count: items.length }), {
    headers: { "Content-Type": "application/json" },
  });
}
