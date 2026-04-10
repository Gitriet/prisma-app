import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/today — return today's topic (articles without source revealed)
// If user already voted, also return their vote so the UI can show the reveal
export async function GET() {
  const session = await auth();

  // Find today's topic
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const topic = await prisma.topic.findFirst({
    where: {
      date: today,
      publishedAt: { not: null },
    },
    include: {
      articles: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          text: true,
          // source and framing are intentionally omitted here — revealed separately
        },
      },
    },
  });

  if (!topic) {
    return NextResponse.json({ topic: null });
  }

  // Check if user has already voted
  let userVote: { articleId: string } | null = null;
  let revealArticles: { id: string; position: number; source: string; framing: string }[] = [];

  if (session?.user?.id) {
    userVote = await prisma.vote.findUnique({
      where: { userId_topicId: { userId: session.user.id, topicId: topic.id } },
      select: { articleId: true },
    });

    if (userVote) {
      // Fetch full articles with source+framing for the reveal
      revealArticles = await prisma.article.findMany({
        where: { topicId: topic.id },
        orderBy: { position: "asc" },
        select: { id: true, position: true, source: true, framing: true },
      });
    }
  }

  return NextResponse.json({
    topic: {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      articles: topic.articles,
    },
    userVote,
    revealArticles: userVote ? revealArticles : [],
  });
}
