"use client";

import { useState, useEffect } from "react";

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

const emptyArticles = (): ArticleForm[] => [
  { position: 1, text: "", source: "", framing: "" },
  { position: 2, text: "", source: "", framing: "" },
  { position: 3, text: "", source: "", framing: "" },
];

export default function AdminClient() {
  const [topics, setTopics] = useState<TopicWithArticles[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [articles, setArticles] = useState<ArticleForm[]>(emptyArticles());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    loadTopics();
  }, []);

  async function loadTopics() {
    setLoading(true);
    const res = await fetch("/api/topics");
    if (res.ok) setTopics(await res.json());
    setLoading(false);
  }

  function updateArticle(idx: number, field: keyof ArticleForm, value: string) {
    setArticles((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a))
    );
  }

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
      setSaveMsg("✓ Onderwerp opgeslagen.");
      setTitle("");
      setDescription("");
      setArticles(emptyArticles());
      setDate(new Date().toISOString().split("T")[0]);
      loadTopics();
    } else {
      const data = await res.json();
      setSaveMsg(`Fout: ${data.error ?? "Onbekende fout"}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je dit onderwerp wilt verwijderen?")) return;
    await fetch(`/api/topics/${id}`, { method: "DELETE" });
    loadTopics();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif font-bold text-2xl mb-2">Admin — Nieuw onderwerp</h1>
      <p className="text-muted text-sm mb-8">
        Voeg een dagelijks onderwerp toe. De bronnen zijn alleen hier zichtbaar.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Datum + titel */}
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

        {/* Drie artikelen */}
        {articles.map((a, i) => (
          <div
            key={i}
            className="border border-ink/10 rounded-2xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-sm">Tekst {i + 1}</h2>
              <span className="text-xs text-muted">Alleen zichtbaar voor jou</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Bron (verborgen)</label>
                <input
                  type="text"
                  value={a.source}
                  onChange={(e) => updateArticle(i, "source", e.target.value)}
                  placeholder="Bijv. De Telegraaf"
                  className="w-full px-3 py-2 border border-ink/20 rounded-xl bg-cream text-ink text-sm outline-none focus:border-ink"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Framing (reveal-tekst)</label>
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
              <label className="block text-xs text-muted mb-1">Tekst (getoond aan lezer)</label>
              <textarea
                value={a.text}
                onChange={(e) => updateArticle(i, "text", e.target.value)}
                placeholder="Plak hier de tekst die de lezer te zien krijgt…"
                rows={6}
                className="w-full px-3 py-2 border border-ink/20 rounded-xl bg-cream text-ink text-sm outline-none focus:border-ink resize-y"
                required
              />
            </div>
          </div>
        ))}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-ink text-cream font-medium text-sm px-6 py-2.5 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Onderwerp opslaan"}
          </button>
          {saveMsg && (
            <span
              className={`text-sm ${saveMsg.startsWith("Fout") ? "text-c1" : "text-c3"}`}
            >
              {saveMsg}
            </span>
          )}
        </div>
      </form>

      {/* Existing topics */}
      <div className="mt-16">
        <h2 className="font-serif font-bold text-lg mb-4">Eerder toegevoegd</h2>

        {loading ? (
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
