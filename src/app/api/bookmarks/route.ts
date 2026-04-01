import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    include: {
      post: {
        include: {
          author: { select: { id: true, nickname: true, profileImage: true } },
          _count: { select: { comments: true, likes: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookmarks);
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { postId } = await req.json();

  if (!postId) {
    return NextResponse.json({ error: "postId가 필요합니다" }, { status: 400 });
  }

  // Toggle bookmark
  const existing = await prisma.bookmark.findUnique({
    where: { userId_postId: { userId: session.user.id, postId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false });
  } else {
    await prisma.bookmark.create({
      data: { userId: session.user.id, postId },
    });
    return NextResponse.json({ bookmarked: true });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");

  if (!postId) {
    return NextResponse.json({ error: "postId가 필요합니다" }, { status: 400 });
  }

  await prisma.bookmark.deleteMany({
    where: { userId: session.user.id, postId },
  });

  return NextResponse.json({ success: true });
}
