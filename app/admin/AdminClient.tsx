"use client";

import { useState, useEffect } from "react";
import type { GeneratedTopic, GeneratedArticle } from "@/lib/ai-cluster";

// ── Types ────────────────────────────────────────────────────
type ArticleForm = {
  position: number;
  text: string;
  source: string;
  framing: string;
};

type TopicWithArticles = {
  id: string;
  date: string;
  title: string;
  description?: string;
  articles: (ArticleForm & { id: string })[];
};

// ── Helpers ──────────────────────────────────────────────────
const emptyArticles = (n = 5): ArticleForm[] =>
  Array.from({ length: n }, (_, i) => ({
    position: i + 1,
    text: "",
    source: "",
    framing: "",
  }));

function generatedToForm(topic: GeneratedTopic): {
  title: string;
  description: string;
  articles: ArticleForm[];
} {
  return {
    title: topic.title,
    description: topic.description,
    articles: topic.articles.map((a: GeneratedArticle) => ({
      position: a.position,
      text: a.blindText,
      source: a.source,
      framing: a.framing,
    })),
  };
}

// ── Component ────────────────────────────────────────────────
export default function AdminClient() {
  // Existing topics
  const [topics, setTopics] = useState<TopicWithArticles[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Generate flow
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedTopic[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [generateError, setGenerateError] = useState("");

  // Form state (manual or from AI suggestion)
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [articles, setArticles] = useState<ArticleForm[]>(emptyArticles());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => { loadTopics(); }, []);

  async function loadTopics() {
    setLoadingTopics(true);
    const res = await fetch("/api/topics");
    if (res.ok) setTopics(await res.json());
    setLoadingTopics(false);
  }

  const [statusMsg, setStatusMsg] = useState("");

  // ── Generate: stap 1 RSS, stap 2 Claude SSE ─────────────────
  async function handleGenerate() {
    setGenerating(true);
    setGenerateError("");
    setGenerated(null);
    setSelectedIdx(null);
    setStatusMsg("RSS-feeds ophalen…");

    // Stap 1: RSS
    let items: unknown[];
    try {
      const rssRes = await fetch("/api/generate/rss", { method: "POST" });
      const rssData = await rssRes.json() as { items?: unknown[]; error?: string };
      if (!rssRes.ok || !rssData.items) {
        setGenerateError(rssData.error ?? "RSS ophalen mislukt.");
        setGenerating(false);
        return;
      }
      items = rssData.items;
      setStatusMsg(`${items.length} artikelen geladen. AI clustert…`);
    } catch {
      setGenerateError("RSS ophalen mislukt.");
      setGenerating(false);
      return;
    }

    // Stap 2: Claude via SSE
    const clusterRes = await fetch("/api/generate/cluster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!clusterRes.ok || !clusterRes.body) {
      const data = await clusterRes.json() as { error?: string };
      setGenerateError(data.error ?? "Genereren mislukt.");
      setGenerating(false);
      return;
    }

    const reader = clusterRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      let event = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          event = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
            if (event === "status") setStatusMsg(payload.message as string);
            if (event === "error") { setGenerateError(payload.message as string); setGenerating(false); }
            if (event === "done") { setGenerated(payload.topics as GeneratedTopic[]); setGenerating(false); setStatusMsg(""); }
          } catch { /* ignore parse errors */ }
          event = "";
        }
      }
    }
    setGenerating(false);
  }

  function selectSuggestion(idx: number) {
    setSelectedIdx(idx);
    const f = generatedToForm(generated![idx]);
    setTitle(f.title);
    setDescription(f.description);
    setArticles(f.articles);
  }

  // ── Article editing ─────────────────────────────────────────
  function updateArticle(idx: number, field: keyof ArticleForm, value: string) {
    setArticles((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a))
    );
  }

  function addArticle() {
    setArticles((prev) => [
      ...prev,
      { position: prev.length + 1, text: "", source: "", framing: "" },
    ]);
  }

  function removeArticle(idx: number) {
    setArticles((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((a, i) => ({ ...a, position: i + 1 }))
    );
  }

  // ── Save ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");

    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, title, description, articles }),
    });

    setSaving(false);
    if (res.ok) {
      setSaveMsg("✓ Onderwerp gepubliceerd.");
      resetForm();
      loadTopics();
    } else {
      const data = await res.json() as { error?: string };
      setSaveMsg(`Fout: ${data.error ?? "Onbekende fout"}`);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setArticles(emptyArticles());
    setDate(new Date().toISOString().split("T")[0]);
    setGenerated(null);
    setSelectedIdx(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je dit onderwerp wilt verwijderen?")) return;
    await fetch(`/api/topics/${id}`, { method: "DELETE" });
    loadTopics();
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif font-bold text-2xl mb-1">Admin</h1>
      <p className="text-muted text-sm mb-8">
        Genereer via AI of voeg handmatig een onderwerp toe.
      </p>

      {/* ── AI genereren ── */}
      <div className="border border-ink/10 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Genereer vandaag</h2>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-ink text-cream text-sm font-medium px-5 py-2 rounded-full hover:opacity-80 disabled:opacity-40 transition-opacity flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                Bezig…
              </>
            ) : (
              "✦ Genereer vandaag"
            )}
          </button>
        </div>
        <p className="text-xs text-muted">
          Haalt RSS-feeds op van 7 kranten en laat AI de sterkste onderwerpen clusteren.
        </p>
        {statusMsg && (
          <p className="mt-2 text-xs text-muted flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 border-2 border-muted/40 border-t-muted rounded-full animate-spin" />
            {statusMsg}
          </p>
        )}
        {generateError && <p className="mt-3 text-xs text-c1">{generateError}</p>}

        {/* Suggesties */}
        {generated && generated.length > 0 && (
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              {generated.length} suggesties — klik om te selecteren en bewerken
            </p>
            {generated.map((topic, i) => (
              <button
                key={i}
                onClick={() => selectSuggestion(i)}
                className={[
                  "text-left border rounded-xl px-4 py-3 transition-all",
                  selectedIdx === i
                    ? "border-ink bg-ink/5"
                    : "border-ink/15 hover:border-ink/30",
                ].join(" ")}
              >
                <p className="font-medium text-sm">{topic.title}</p>
                <p className="text-xs text-muted mt-0.5 line-clamp-2">
                  {topic.description}
                </p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {topic.articles.map((a) => (
                    <span
                      key={a.position}
                      className="text-xs bg-ink/5 text-muted px-2 py-0.5 rounded-full"
                    >
                      {a.source}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Formulier ── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">
              Datum
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-ink/20 rounded-xl bg-cream text-ink text-sm outline-none focus:border-ink"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">
              Onderwerp
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Kabinet kondigt bezuinigingen aan"
              className="w-full px-4 py-2.5 border border-ink/20 rounded-xl bg-cream text-ink text-sm outline-none focus:border-ink"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">
            Korte omschrijving (optioneel)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Eén zin context voor de lezer"
            className="w-full px-4 py-2.5 border border-ink/20 rounded-xl bg-cream text-ink text-sm outline-none focus:border-ink"
          />
        </div>

        {/* Artikelen */}
        {articles.map((a, i) => (
          <div key={i} className="border border-ink/10 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-sm">Tekst {i + 1}</h2>
              {articles.length > 3 && (
                <button
                  type="button"
                  onClick={() => removeArticle(i)}
                  className="text-xs text-c1 hover:underline"
                >
                  Verwijderen
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Bron (verborgen)</label>
                <input
                  type="text"
                  value={a.source}
                  onChange={(e) => updateArticle(i, "source", e.target.value)}
                  placeholder="Bijv. Volkskrant"
                  className="w-full px-3 py-2 border border-ink/20 rounded-xl bg-cream text-ink text-sm outline-none focus:border-ink"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Framing (na reveal)</label>
                <input
                  type="text"
                  value={a.framing}
                  onChange={(e) => updateArticle(i, "framing", e.target.value)}
                  placeholder="Bijv. Nadruk op economische noodzaak"
                  className="w-full px-3 py-2 border border-ink/20 rounded-xl bg-cream text-ink text-sm outline-none focus:border-ink"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Blinde tekst (getoond aan lezer)</label>
              <textarea
                value={a.text}
                onChange={(e) => updateArticle(i, "text", e.target.value)}
                placeholder="Neutrale tekst zonder herkenbare schrijfstijl…"
                rows={6}
                className="w-full px-3 py-2 border border-ink/20 rounded-xl bg-cream text-ink text-sm outline-none focus:border-ink resize-y"
                required
              />
            </div>
          </div>
        ))}

        {articles.length < 5 && (
          <button
            type="button"
            onClick={addArticle}
            className="text-sm text-muted border border-dashed border-ink/20 rounded-xl py-2.5 hover:border-ink/40 transition-colors"
          >
            + Tekst toevoegen
          </button>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-ink text-cream font-medium text-sm px-6 py-2.5 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saving ? "Publiceren…" : "Publiceer onderwerp →"}
          </button>
          {saveMsg && (
            <span className={`text-sm ${saveMsg.startsWith("Fout") ? "text-c1" : "text-c3"}`}>
              {saveMsg}
            </span>
          )}
        </div>
      </form>

      {/* ── Eerder gepubliceerd ── */}
      <div className="mt-16">
        <h2 className="font-serif font-bold text-lg mb-4">Gepubliceerd</h2>
        {loadingTopics ? (
          <p className="text-muted text-sm">Laden…</p>
        ) : topics.length === 0 ? (
          <p className="text-muted text-sm">Nog geen onderwerpen.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {topics.map((t) => (
              <div
                key={t.id}
                className="border border-ink/10 rounded-2xl p-5 flex items-start justify-between gap-4"
              >
                <div>
                  <p className="text-xs text-muted mb-0.5">
                    {new Date(t.date).toLocaleDateString("nl-NL", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="font-medium text-sm">{t.title}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {t.articles.map((a) => (
                      <span
                        key={a.id ?? a.position}
                        className="text-xs bg-ink/5 text-muted px-2 py-0.5 rounded-full"
                      >
                        {a.position}. {a.source}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-xs text-c1 hover:underline shrink-0"
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
