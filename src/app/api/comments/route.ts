import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { content, postId, parentId, isAnonymous } = body;

    if (!content?.trim() || !postId) {
      return NextResponse.json({ error: "내용과 게시글을 입력해주세요" }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: "댓글은 1,000자 이하여야 합니다" }, { status: 400 });
    }

    // 대댓글 depth check (1단계만)
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ error: "부모 댓글을 찾을 수 없습니다" }, { status: 404 });
      }
      if (parent.parentId) {
        return NextResponse.json({ error: "대댓글은 1단계만 가능합니다" }, { status: 400 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorId: session.user.id,
        postId,
        parentId: parentId || null,
        isAnonymous: !!isAnonymous,
        anonymousAuthorId: !!isAnonymous ? session.user.id : null,
      },
      include: {
        author: { select: { id: true, nickname: true, profileImage: true } },
        _count: { select: { likes: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST /api/comments error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const userId = session?.user?.id;

  if (!postId) {
    return NextResponse.json({ error: "postId가 필요합니다" }, { status: 400 });
  }

  // Deleted comments: admin만 볼 수 있음
  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null, ...(isAdmin ? {} : { deletedAt: null }) },
    include: {
      author: { select: { id: true, nickname: true, profileImage: true } },
      _count: { select: { likes: true } },
      // Check if current user liked this comment
      likes: userId ? { where: { userId } } : false,
      replies: {
        where: isAdmin ? {} : { deletedAt: null },
        include: {
          author: { select: { id: true, nickname: true, profileImage: true } },
          _count: { select: { likes: true } },
          likes: userId ? { where: { userId } } : false,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}
