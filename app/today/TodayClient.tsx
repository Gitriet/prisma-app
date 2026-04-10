"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Article = {
  id: string;
  position: number;
  text: string;
};

type RevealArticle = {
  id: string;
  position: number;
  source: string;
  framing: string;
};

type TodayData = {
  topic: {
    id: string;
    title: string;
    description?: string;
    articles: Article[];
  } | null;
  userVote: { articleId: string } | null;
  revealArticles: RevealArticle[];
};

// Colour palette for the reveal: position → colour token (supports 3-5 articles)
const REVEAL_COLORS = [
  { bg: "bg-c1-bg", border: "border-c1/20", label: "text-c1", dot: "#d04a2f" },
  { bg: "bg-c2-bg", border: "border-c2/20", label: "text-c2", dot: "#2255b8" },
  { bg: "bg-c3-bg", border: "border-c3/20", label: "text-c3", dot: "#1a7c4f" },
  { bg: "bg-ink/5", border: "border-ink/15", label: "text-ink", dot: "#0c0c0b" },
  { bg: "bg-ink/[0.03]", border: "border-ink/10", label: "text-muted", dot: "#6b6b67" },
];

export default function TodayClient({ userId }: { userId: string }) {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/today")
      .then((r) => r.json())
      .then((d: TodayData) => {
        setData(d);
        if (d.userVote) {
          setSelected(d.userVote.articleId);
          setRevealed(true);
        }
        setLoading(false);
      });
  }, []);

  async function handleVote() {
    if (!selected || !data?.topic || submitting) return;
    setSubmitting(true);

    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: data.topic.id, articleId: selected }),
    });

    if (res.ok) {
      // Re-fetch to get reveal data
      const fresh = await fetch("/api/today").then((r) => r.json()) as TodayData;
      setData(fresh);
      setRevealed(true);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted text-sm">Laden…</p>
      </div>
    );
  }

  if (!data?.topic) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 text-center">
        <p className="font-serif font-bold text-xl mb-3">Geen onderwerp vandaag</p>
        <p className="text-muted text-sm max-w-xs">
          De redacteur heeft nog geen teksten geplaatst voor vandaag. Kom later terug.
        </p>
      </div>
    );
  }

  const { topic, revealArticles } = data;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium tracking-widest uppercase text-muted mb-2">
          {new Date().toLocaleDateString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="font-serif font-bold text-2xl leading-snug mb-2">{topic.title}</h1>
        {topic.description && (
          <p className="text-muted text-sm leading-relaxed">{topic.description}</p>
        )}
      </div>

      {/* Instruction */}
      {!revealed && (
        <p className="text-sm text-muted border border-ink/10 rounded-xl px-4 py-3 mb-8 leading-relaxed">
          Lees de drie teksten hieronder. De bronnen zijn verborgen. Kies daarna welke jij{" "}
          <strong className="text-ink font-medium">het meest geloofwaardig</strong> vindt.
        </p>
      )}

      {/* Articles */}
      <div className="flex flex-col gap-5">
        {topic.articles.map((article, i) => {
          const isSelected = selected === article.id;
          const revealData = revealArticles.find((r) => r.id === article.id);
          const colors = REVEAL_COLORS[i];

          return (
            <div
              key={article.id}
              onClick={() => !revealed && setSelected(article.id)}
              className={[
                "rounded-2xl border transition-all duration-200",
                revealed
                  ? `${colors.bg} ${colors.border}`
                  : isSelected
                  ? "border-ink/40 bg-ink/[0.03] cursor-pointer"
                  : "border-ink/10 bg-cream hover:border-ink/25 cursor-pointer",
              ].join(" ")}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-0">
                <div className="flex items-center gap-2">
                  {/* Selection indicator */}
                  <div
                    className={[
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      revealed
                        ? "border-transparent"
                        : isSelected
                        ? "border-ink bg-ink"
                        : "border-ink/30",
                    ].join(" ")}
                  >
                    {!revealed && isSelected && (
                      <div className="w-2 h-2 rounded-full bg-cream" />
                    )}
                    {revealed && revealData && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: colors.dot }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted">
                    Tekst {article.position}
                  </span>
                </div>

                {/* Chosen badge */}
                {revealed && isSelected && (
                  <span className="text-xs font-medium bg-ink text-cream px-2.5 py-0.5 rounded-full">
                    Jouw keuze
                  </span>
                )}
              </div>

              {/* Reveal: source name */}
              {revealed && revealData && (
                <div className="px-5 pt-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${colors.label}`}>
                    {revealData.source}
                  </span>
                </div>
              )}

              {/* Article text */}
              <div className="px-5 py-4">
                <p className="text-sm leading-relaxed text-ink whitespace-pre-line">
                  {article.text}
                </p>
              </div>

              {/* Reveal: framing */}
              {revealed && revealData && (
                <div className={`mx-5 mb-4 px-4 py-3 rounded-xl ${colors.bg} border ${colors.border}`}>
                  <p className="text-xs text-muted leading-relaxed">
                    <span className="font-medium text-ink">Framing: </span>
                    {revealData.framing}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA or post-reveal actions */}
      <div className="mt-8">
        {!revealed ? (
          <button
            onClick={handleVote}
            disabled={!selected || submitting}
            className="w-full bg-ink text-cream font-medium text-sm py-3.5 rounded-full hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {submitting
              ? "Opslaan…"
              : selected
              ? "Bevestig mijn keuze →"
              : "Selecteer eerst een tekst"}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted">
              Je keuze is opgeslagen. Kom morgen terug voor een nieuw onderwerp.
            </p>
            <Link
              href="/profile"
              className="text-sm font-medium text-ink border border-ink/25 px-5 py-2 rounded-full hover:bg-ink hover:text-cream transition-all"
            >
              Bekijk mijn mediapatroon →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
