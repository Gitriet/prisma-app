import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchAllFeeds } from "@/lib/rss";
import { clusterAndGenerate } from "@/lib/ai-cluster";

export const maxDuration = 60; // Vercel max voor hobby plan

export async function POST() {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await fetchAllFeeds();
    if (items.length === 0) {
      return NextResponse.json({ error: "Geen RSS-items opgehaald." }, { status: 502 });
    }

    const topics = await clusterAndGenerate(items);
    return NextResponse.json({ topics });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
