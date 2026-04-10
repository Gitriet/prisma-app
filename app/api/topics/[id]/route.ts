import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/topics/[id] — admin only, update topic + articles
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, description, articles } = body as {
    title: string;
    description?: string;
    articles: { position: number; text: string; source: string; framing: string }[];
  };

  // Delete existing articles and recreate
  await prisma.article.deleteMany({ where: { topicId: id } });

  const topic = await prisma.topic.update({
    where: { id },
    data: {
      title,
      description,
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

  return NextResponse.json(topic);
}

// DELETE /api/topics/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.topic.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
