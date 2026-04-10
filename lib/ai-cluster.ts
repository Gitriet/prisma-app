import Anthropic from "@anthropic-ai/sdk";
import { RssItem } from "./rss";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type GeneratedArticle = {
  position: number;
  source: string;
  blindText: string;
  framing: string;
};

export type GeneratedTopic = {
  title: string;
  description: string;
  articles: GeneratedArticle[];
};

export async function clusterAndGenerate(items: RssItem[]): Promise<GeneratedTopic[]> {
  // Eén enkele Claude-aanroep: cluster + herschrijf tegelijk
  const prompt = `
Je bent redacteur van Prisma, een Nederlandse mediageletterdheids-app.

Je krijgt nieuwsartikelen van 7 kranten: Volkskrant, Telegraaf, NOS, FD, NRC, AD en NYT.

Doe dit in één stap:
1. Identificeer de 3 sterkste nieuwsonderwerpen waarbij minstens 3 kranten iets schreven.
2. Kies per onderwerp de 5 meest representatieve artikelen (maximaal 1 per krant).
3. Herschrijf elk artikel als een BLINDE tekst van 120-150 woorden in neutraal Nederlands:
   - Zelfde feiten, volledig andere formulering
   - Geen herkenbare schrijfstijl, geen krantnaam, geen "wij"
   - Alle 5 teksten even lang en in hetzelfde register
4. Schrijf per tekst een framing-notitie (1 zin) die de redactionele invalshoek benoemt.

Antwoord UITSLUITEND als geldig JSON in dit formaat, zonder uitleg:
{
  "topics": [
    {
      "title": "Korte Nederlandse titel (max 10 woorden)",
      "description": "1-2 zinnen context voor de lezer",
      "articles": [
        {
          "source": "Krantnaam",
          "blindText": "Herschreven neutrale tekst van 120-150 woorden...",
          "framing": "Eén zin die de invalshoek benoemt."
        }
      ]
    }
  ]
}

Artikelen (${items.length} stuks):
${items
  .slice(0, 60)
  .map((item, i) => `[${i}] ${item.source}: ${item.title}\n${item.summary.slice(0, 250)}`)
  .join("\n\n")}
`;

  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (res.content[0] as { type: string; text: string }).text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude gaf geen geldige JSON terug.");

  const parsed = JSON.parse(match[0]) as {
    topics: {
      title: string;
      description: string;
      articles: { source: string; blindText: string; framing: string }[];
    }[];
  };

  return parsed.topics.slice(0, 3).map((topic) => ({
    title: topic.title,
    description: topic.description,
    articles: topic.articles.slice(0, 5).map((a, i) => ({
      position: i + 1,
      source: a.source,
      blindText: a.blindText,
      framing: a.framing,
    })),
  }));
}
