import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/topics — admin only, list all topics
export async function GET() {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topics = await prisma.topic.findMany({
    orderBy: { date: "desc" },
    include: { articles: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json(topics);
}

// POST /api/topics — admin only, create a topic with 3 articles
export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, title, description, articles } = body as {
    date: string;
    title: string;
    description?: string;
    articles: { position: number; text: string; source: string; framing: string }[];
  };

  if (!date || !title || !articles || articles.length !== 3) {
    return NextResponse.json({ error: "Vereiste velden ontbreken." }, { status: 400 });
  }

  const topic = await prisma.topic.create({
    data: {
      date: new Date(date),
      title,
      description,
      publishedAt: new Date(),
      articles: {
        create: articles.map((a) => ({
          position: a.position,
          text: a.text,
          source: a.source,
          framing: a.framing,
        })),
      },
    },
    include: { articles: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json(topic, { status: 201 });
}
