"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PatternEntry = {
  source: string;
  count: number;
  percentage: number;
};

type VoteRecord = {
  topicTitle: string;
  topicDate: string;
  chosenSource: string;
  chosenPosition: number;
  votedAt: string;
};

type ProfileData = {
  totalVotes: number;
  hasPattern: boolean;
  pattern: PatternEntry[];
  votes: VoteRecord[];
};

function colorForSource(source: string, allSources: string[]) {
  const COLORS = [
    { bar: "bg-c1", text: "text-c1", light: "bg-c1-bg", border: "border-c1/20" },
    { bar: "bg-c2", text: "text-c2", light: "bg-c2-bg", border: "border-c2/20" },
    { bar: "bg-c3", text: "text-c3", light: "bg-c3-bg", border: "border-c3/20" },
    { bar: "bg-ink/60", text: "text-ink", light: "bg-ink/5", border: "border-ink/15" },
    { bar: "bg-ink/40", text: "text-muted", light: "bg-ink/5", border: "border-ink/10" },
  ];
  const idx = allSources.indexOf(source) % COLORS.length;
  return COLORS[idx >= 0 ? idx : 0];
}

const NEED_MORE = 7;

export default function ProfileClient() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: ProfileData) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted text-sm">Laden…</p>
      </div>
    );
  }

  if (!data) return null;

  const allSources = data.pattern.map((p) => p.source);
  const remaining = Math.max(0, NEED_MORE - data.totalVotes);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-serif font-bold text-2xl mb-1">Mijn mediapatroon</h1>
      <p className="text-muted text-sm mb-10">
        Welke bronnen vind jij het meest geloofwaardig?
      </p>

      {!data.hasPattern ? (
        <div className="border border-ink/10 rounded-2xl p-8 text-center mb-10">
          <div className="font-serif text-4xl font-black text-ink/10 mb-3">
            {data.totalVotes}/{NEED_MORE}
          </div>
          <p className="font-medium mb-2">Patroon nog niet zichtbaar</p>
          <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
            Lees nog{" "}
            <strong className="text-ink">{remaining} dag{remaining !== 1 ? "en" : ""}</strong>{" "}
            om je persoonlijke mediapatroon te zien.
          </p>
          <Link
            href="/today"
            className="inline-block mt-6 bg-ink text-cream text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-80 transition-opacity"
          >
            Lees vandaag →
          </Link>
        </div>
      ) : (
        <div className="mb-10">
          <div className="flex flex-col gap-4">
            {data.pattern.map((entry) => {
              const c = colorForSource(entry.source, allSources);
              return (
                <div key={entry.source}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-medium ${c.text}`}>{entry.source}</span>
                    <span className="text-xs text-muted">
                      {entry.percentage}% · {entry.count}×
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-ink/8 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.bar} transition-all duration-700`}
                      style={{ width: `${entry.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {data.pattern.length > 0 && (
            <p className="mt-5 text-xs text-muted">
              Je hebt{" "}
              <strong className="text-ink">{data.pattern[0].source}</strong> het vaakst
              geloofwaardig gevonden ({data.pattern[0].percentage}% van jouw stemmen).
            </p>
          )}
        </div>
      )}

      {data.votes.length > 0 && (
        <div>
          <h2 className="font-serif font-bold text-base mb-4">Geschiedenis</h2>
          <div className="flex flex-col gap-2">
            {data.votes.map((v, i) => {
              const c = colorForSource(v.chosenSource, allSources);
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between border ${c.border} ${c.light} rounded-xl px-4 py-3`}
                >
                  <div>
                    <p className="text-sm font-medium leading-snug">{v.topicTitle}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(v.topicDate).toLocaleDateString("nl-NL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${c.text} shrink-0 ml-4`}>
                    {v.chosenSource}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.votes.length === 0 && (
        <div className="text-center mt-8">
          <p className="text-muted text-sm mb-4">Je hebt nog niet gestemd.</p>
          <Link
            href="/today"
            className="inline-block bg-ink text-cream text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-80 transition-opacity"
          >
            Lees vandaag →
          </Link>
        </div>
      )}
    </div>
  );
}
