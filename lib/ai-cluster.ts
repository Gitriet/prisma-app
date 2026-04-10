import Anthropic from "@anthropic-ai/sdk";
import { RssItem } from "./rss";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type GeneratedArticle = {
  position: number;      // 1-5
  source: string;        // krant, alleen zichtbaar voor admin + reveal
  blindText: string;     // geneutraliseerde tekst getoond aan lezer
  framing: string;       // korte framing-notitie voor admin/reveal
};

export type GeneratedTopic = {
  title: string;
  description: string;
  articles: GeneratedArticle[];
};

export async function clusterAndGenerate(items: RssItem[]): Promise<GeneratedTopic[]> {
  // Stap 1: cluster en selecteer 3-5 onderwerpen
  const clusterPrompt = `
Je krijgt een lijst van nieuwsartikelen van 7 Nederlandse en internationale kranten (Volkskrant, Telegraaf, NOS, FD, NRC, AD, NYT).

Jouw taak:
1. Groepeer artikelen die duidelijk over hetzelfde nieuwsonderwerp gaan.
2. Selecteer de 3 sterkste nieuwsonderwerpen van vandaag — kies onderwerpen waarbij minimaal 3 verschillende kranten iets over schreven.
3. Geef per onderwerp een korte Nederlandse titel (max 10 woorden) en een beschrijving (1-2 zinnen context).
4. Vermeld welke kranten over dat onderwerp schreven (maximaal 5, kies de meest representatieve).

Antwoord ALLEEN in dit JSON-formaat (geen uitleg erbuiten):
{
  "topics": [
    {
      "title": "...",
      "description": "...",
      "sources": ["Volkskrant", "Telegraaf", "NOS"],
      "articleIndices": [0, 4, 12, 7, 3]
    }
  ]
}

Artikelen:
${items
  .map((item, i) => `[${i}] ${item.source}: ${item.title}\n${item.summary.slice(0, 200)}`)
  .join("\n\n")}
`;

  const clusterRes = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: clusterPrompt }],
  });

  const clusterText = (clusterRes.content[0] as { type: string; text: string }).text;
  const jsonMatch = clusterText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude returned geen geldige JSON voor clustering");

  const { topics: clusters } = JSON.parse(jsonMatch[0]) as {
    topics: { title: string; description: string; sources: string[]; articleIndices: number[] }[];
  };

  // Stap 2: per onderwerp blinde teksten + framing genereren
  const results: GeneratedTopic[] = [];

  for (const cluster of clusters.slice(0, 3)) {
    const selectedItems = cluster.articleIndices
      .slice(0, 5)
      .map((i) => items[i])
      .filter(Boolean);

    if (selectedItems.length < 3) continue;

    const rewritePrompt = `
Je schrijft blinde teksten voor een mediageletterdheids-app genaamd Prisma.

Onderwerp: "${cluster.title}"
Context: ${cluster.description}

Hieronder staan ${selectedItems.length} nieuwsartikelen over dit onderwerp van verschillende kranten. Jouw taak per artikel:
1. Schrijf een BLINDE tekst van 120-160 woorden in het Nederlands.
   - Zelfde informatie als het origineel, maar VOLLEDIG herschreven in neutrale stijl
   - Geen herkenbare schrijfstijl, geen naam van de krant, geen "wij", geen typische woordkeuze die de bron verraadt
   - Alle teksten even lang en in hetzelfde register
2. Schrijf een korte framing-notitie (1 zin) die de redactionele keuze of invalshoek benoemt — dit zien alleen de admin en de gebruiker nà de reveal.

Antwoord ALLEEN in dit JSON-formaat:
{
  "articles": [
    {
      "source": "naam van de krant",
      "blindText": "...",
      "framing": "..."
    }
  ]
}

Artikelen:
${selectedItems
  .map((item, i) => `\n--- Artikel ${i + 1} (${item.source}) ---\n${item.title}\n${item.summary}`)
  .join("\n")}
`;

    const rewriteRes = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      messages: [{ role: "user", content: rewritePrompt }],
    });

    const rewriteText = (rewriteRes.content[0] as { type: string; text: string }).text;
    const rewriteMatch = rewriteText.match(/\{[\s\S]*\}/);
    if (!rewriteMatch) continue;

    const { articles } = JSON.parse(rewriteMatch[0]) as {
      articles: { source: string; blindText: string; framing: string }[];
    };

    results.push({
      title: cluster.title,
      description: cluster.description,
      articles: articles.map((a, i) => ({
        position: i + 1,
        source: a.source,
        blindText: a.blindText,
        framing: a.framing,
      })),
    });
  }

  return results;
}
