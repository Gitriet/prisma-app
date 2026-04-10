"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Vul een geldig e-mailadres in.");
      return;
    }
    setError("");
    setLoading(true);
    const res = await signIn("nodemailer", {
      email,
      redirect: false,
      callbackUrl: "/today",
    });
    setLoading(false);
    if (res?.error) {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-1.5 text-muted text-sm mb-8 hover:text-ink transition-colors">
          ← Terug
        </Link>

        <h1 className="font-serif font-bold text-2xl mb-2">Inloggen</h1>
        <p className="text-muted text-sm mb-8 leading-relaxed">
          Vul je e-mailadres in. We sturen je een inloglink — geen wachtwoord nodig.
        </p>

        {sent ? (
          <div className="bg-c3-bg border border-c3/20 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-3">✉️</div>
            <p className="font-medium mb-1">Controleer je inbox</p>
            <p className="text-sm text-muted">
              We hebben een inloglink gestuurd naar <strong>{email}</strong>.
              De link is 24 uur geldig.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jouw@email.nl"
              className="w-full px-4 py-3 border border-ink/20 rounded-full bg-cream text-ink placeholder-muted text-sm outline-none focus:border-ink transition-colors"
              required
              autoFocus
            />
            {error && <p className="text-c1 text-xs px-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-cream font-medium text-sm py-3 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {loading ? "Versturen…" : "Stuur inloglink →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
