import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const comment = await prisma.comment.findUnique({ where: { id } });

  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다" }, { status: 404 });
  }

  // Author or Admin only
  if (comment.authorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 });
  }

  // Soft delete
  await prisma.comment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
