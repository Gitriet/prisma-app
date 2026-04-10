import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth().catch(() => null);
  if (session) redirect("/today");

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs font-medium tracking-widest uppercase text-muted mb-6">
        Dagelijks · Drie perspectieven
      </p>

      <h1 className="font-serif font-black text-[clamp(2.2rem,6vw,4rem)] leading-[1.05] tracking-tight max-w-3xl mb-6">
        <span className="block text-ink">Hetzelfde nieuws.</span>
        <span
          className="block italic"
          style={{
            background: "linear-gradient(90deg,#d04a2f 0%,#2255b8 50%,#1a7c4f 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Drie compleet andere verhalen.
        </span>
      </h1>

      <p className="text-muted text-base max-w-md mb-10 leading-relaxed">
        Elke dag één onderwerp, drie media-teksten. De bronnen zijn verborgen.
        Kies welke framing jij het meest geloofwaardig vindt — en ontdek je mediapatroon.
      </p>

      <Link
        href="/login"
        className="bg-ink text-cream font-medium text-sm px-6 py-3 rounded-full hover:opacity-80 transition-opacity"
      >
        Begin met lezen →
      </Link>

      <div className="mt-16 grid grid-cols-3 gap-3 max-w-2xl w-full text-left">
        {["01", "02", "03"].map((n, i) => (
          <div key={n} className="border border-ink/10 rounded-2xl p-5">
            <div className="font-serif text-3xl font-black text-ink/10 mb-2">{n}</div>
            <p className="font-medium text-sm mb-1">
              {["Lees blind", "Kies je voorkeur", "Zie de reveal"][i]}
            </p>
            <p className="text-xs text-muted leading-relaxed">
              {[
                "Drie teksten, geen logo's, geen kleuren.",
                "Welke vond jij het meest geloofwaardig?",
                "Welke krant was het? Wat zegt dat over jou?",
              ][i]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
