import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const { postId, commentId } = body;

  if (!postId && !commentId) {
    return NextResponse.json({ error: "대상을 선택해주세요" }, { status: 400 });
  }

  try {
    // Toggle like
    const existing = await prisma.like.findFirst({
      where: {
        userId: session.user.id,
        ...(postId ? { postId } : { commentId }),
      },
    });

    if (existing) {
      // Unlike
      await prisma.like.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await prisma.like.create({
        data: {
          userId: session.user.id,
          ...(postId ? { postId } : { commentId }),
        },
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("POST /api/likes error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
