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
1. Identificeer de 3 sterkste nieuwsonderwerpen waarbij minstens 3 kranten iets schreven.
2. Kies per onderwerp de 3 meest representatieve artikelen (maximaal 1 per krant).
3. Schrijf per artikel een framing-notitie (1 zin) die de redactionele invalshoek benoemt — zichtbaar na de reveal.

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
  .slice(0, 35)
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
    articles: topic.articles.slice(0, 3).map((a, i) => {
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
