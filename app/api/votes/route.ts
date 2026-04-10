import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/votes — cast a vote
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId, articleId } = await req.json() as {
    topicId: string;
    articleId: string;
  };

  if (!topicId || !articleId) {
    return NextResponse.json({ error: "topicId en articleId zijn vereist." }, { status: 400 });
  }

  // Upsert: allow changing vote within the same day
  const vote = await prisma.vote.upsert({
    where: { userId_topicId: { userId: session.user.id, topicId } },
    update: { articleId },
    create: { userId: session.user.id, topicId, articleId },
  });

  return NextResponse.json(vote, { status: 201 });
}
