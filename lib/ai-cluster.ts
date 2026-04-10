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
  // Eén enkele Claude-aanroep: cluster + selecteer + framing
  const prompt = `
Je bent redacteur van Prisma, een Nederlandse mediageletterdheids-app.

Je krijgt nieuwsartikelen van 7 kranten: Volkskrant, Telegraaf, NOS, FD, NRC, AD en NYT.

Doe dit:
1. Identificeer de 3 sterkste nieuwsonderwerpen waarbij EXACT hetzelfde nieuws-event door minstens 3 VERSCHILLENDE kranten is behandeld. Als er te weinig recente events zijn waarbij 3 kranten hetzelfde schreven, mag je ook iets oudere events gebruiken uit de feed.
2. Kies per onderwerp precies 3 artikelen die ALLEMAAL over hetzelfde specifieke event gaan — STRIKT 1 artikel per krant, nooit twee keer dezelfde bron.
3. Controleer: staan alle 3 artikelen in de "articles" lijst van VERSCHILLENDE kranten? Zo niet, vervang duplicaten.
4. Kies de 3 bronnen die het meest uiteenlopen in toon, invalshoek of politieke kleur.
5. Schrijf per artikel een framing-notitie (1 zin) die de redactionele invalshoek benoemt — zichtbaar na de reveal.

BELANGRIJK: elk "source" in de articles-lijst van één topic moet UNIEK zijn. Nooit twee keer "NOS" of twee keer "Telegraaf" in hetzelfde topic.

Antwoord UITSLUITEND als geldig JSON in dit formaat, zonder uitleg:
{
  "topics": [
    {
      "title": "Korte Nederlandse titel (max 10 woorden)",
      "description": "1-2 zinnen context voor de lezer",
      "articles": [
        {
          "index": 0,
          "source": "Krantnaam",
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
    model: "claude-haiku-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (res.content[0] as { type: string; text: string }).text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude gaf geen geldige JSON terug.");

  const parsed = JSON.parse(match[0]) as {
    topics: {
      title: string;
      description: string;
      articles: { index: number; source: string; framing: string }[];
    }[];
  };

  return parsed.topics.slice(0, 3).map((topic) => ({
    title: topic.title,
    description: topic.description,
    articles: topic.articles
      .filter((a, i, arr) => {
        // Verwijder duplicaat-bronnen (keep first occurrence)
        return arr.findIndex((b) => b.source === a.source) === i;
      })
      .slice(0, 3)
      .map((a, i) => {
        const original = items[a.index];
        return {
          position: i + 1,
          source: a.source,
          blindText: original
            ? `${original.title}\n\n${original.summary}`
            : "",
          framing: a.framing,
        };
      }),
  }));
}
