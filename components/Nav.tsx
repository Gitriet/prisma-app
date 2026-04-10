"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

type NavProps = { loggedIn: boolean; isAdmin: boolean };

export default function Nav({ loggedIn, isAdmin }: NavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-cream/90 backdrop-blur-md border-b border-ink/10">
      <Link href="/" className="flex items-center gap-2 font-serif font-bold text-[1.1rem] text-ink no-underline">
        <PrismIcon />
        Prisma
      </Link>

      <div className="flex items-center gap-3">
        {loggedIn ? (
          <>
            <Link href="/today" className="text-sm text-muted hover:text-ink transition-colors">
              Vandaag
            </Link>
            <Link href="/profile" className="text-sm text-muted hover:text-ink transition-colors">
              Profiel
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-sm text-muted hover:text-ink transition-colors">
                Admin
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              Uitloggen
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-ink border border-ink/25 px-4 py-1.5 rounded-full hover:bg-ink hover:text-cream transition-all"
          >
            Inloggen
          </Link>
        )}
      </div>
    </nav>
  );
}

function PrismIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <polygon points="10,2 18,17 2,17" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <line x1="10" y1="17" x2="14" y2="17" stroke="#d04a2f" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="17" x2="17" y2="17" stroke="#2255b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="17" x2="18" y2="17" stroke="#1a7c4f" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
