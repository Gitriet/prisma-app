import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/profile — returns the logged-in user's voting history + pattern
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const votes = await prisma.vote.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      topic: { select: { title: true, date: true } },
      article: { select: { source: true, position: true } },
    },
  });

  // Aggregate: count how many times each source was chosen
  const sourceCounts: Record<string, number> = {};
  for (const v of votes) {
    const src = v.article.source;
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
  }

  const totalVotes = votes.length;
  const pattern = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      source,
      count,
      percentage: Math.round((count / totalVotes) * 100),
    }));

  return NextResponse.json({
    totalVotes,
    hasPattern: totalVotes >= 7,
    pattern,
    votes: votes.map((v) => ({
      topicTitle: v.topic.title,
      topicDate: v.topic.date,
      chosenSource: v.article.source,
      chosenPosition: v.article.position,
      votedAt: v.createdAt,
    })),
  });
}
