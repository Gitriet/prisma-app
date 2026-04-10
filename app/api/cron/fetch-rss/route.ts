import { NextRequest, NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/rss";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// Vercel roept dit automatisch aan via vercel.json cron schedule.
// Beveilig met CRON_SECRET zodat niemand anders het kan triggeren.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await fetchAllFeeds();

  // Upsert op link — duplicaten worden genegeerd
  let added = 0;
  for (const item of items) {
    if (!item.link) continue;
    const result = await prisma.rssCache.upsert({
      where: { link: item.link },
      update: {}, // al aanwezig → niets wijzigen
      create: {
        source: item.source,
        title: item.title,
        summary: item.summary,
        link: item.link,
        pubDate: item.pubDate,
      },
    });
    if (result) added++;
  }

  // Ruim items ouder dan 48 uur op
  await prisma.rssCache.deleteMany({
    where: { fetchedAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
  });

  return NextResponse.json({ ok: true, fetched: items.length, added });
}
