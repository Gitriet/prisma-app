import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Prisma — Hetzelfde nieuws. Drie compleet andere verhalen.",
  description:
    "Prisma toont je hoe verschillende media hetzelfde onderwerp framen. Kies welke tekst je het meest geloofwaardig vindt en ontdek je eigen mediapatroon.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth().catch(() => null);
  const navProps = session
    ? {
        loggedIn: true as const,
        isAdmin: (session.user as { isAdmin?: boolean } | undefined)?.isAdmin ?? false,
      }
    : { loggedIn: false as const, isAdmin: false };

  return (
    <html lang="nl">
      <body>
        <Nav {...navProps} />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
