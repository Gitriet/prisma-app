import Parser from "rss-parser";

export type RssItem = {
  source: string;
  title: string;
  summary: string;
  link: string;
  pubDate: string;
};

const FEEDS: { source: string; url: string }[] = [
  { source: "Volkskrant", url: "https://www.volkskrant.nl/rss.xml" },
  { source: "Telegraaf", url: "https://www.telegraaf.nl/rss" },
  { source: "NOS", url: "https://feeds.nos.nl/nosnieuwsalgemeen" },
  { source: "FD", url: "https://fd.nl/rss.xml" },
  { source: "NRC", url: "https://www.nrc.nl/rss/" },
  { source: "AD", url: "https://www.ad.nl/rss.xml" },
  { source: "NYT", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
];

const parser = new Parser({
  timeout: 5000,
  headers: { "User-Agent": "Prisma/1.0 RSS Reader" },
});

async function fetchFeed(source: string, url: string): Promise<RssItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, 15).map((item) => ({
      source,
      title: item.title ?? "",
      summary: item.contentSnippet ?? item.content ?? item.summary ?? "",
      link: item.link ?? "",
      pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
    }));
  } catch (err) {
    console.error(`RSS fetch failed for ${source}:`, err);
    return [];
  }
}

export async function fetchAllFeeds(): Promise<RssItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map((f) => fetchFeed(f.source, f.url))
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
