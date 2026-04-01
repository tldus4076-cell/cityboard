import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCommentSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { content, postId, parentId } = parsed.data;

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
        content,
        authorId: session.user.id,
        postId,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, nickname: true, profileImage: true } },
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

  if (!postId) {
    return NextResponse.json({ error: "postId가 필요합니다" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { postId, deletedAt: null, parentId: null },
    include: {
      author: { select: { id: true, nickname: true, profileImage: true } },
      replies: {
        where: { deletedAt: null },
        include: {
          author: { select: { id: true, nickname: true, profileImage: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}
