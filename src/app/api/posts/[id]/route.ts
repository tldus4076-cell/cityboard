import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    include: {
      author: { select: { id: true, nickname: true, profileImage: true, role: true } },
      files: true,
      _count: { select: { comments: true, likes: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
  }

  // Secret post visibility check
  if (post.postType === "SECRET" && post.authorId !== session?.user?.id && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "비밀글입니다" }, { status: 403 });
  }

  // Hidden post visibility check
  if (post.isHidden && post.authorId !== session?.user?.id && session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "숨김 처리된 글입니다" }, { status: 403 });
  }

  return NextResponse.json(post);
}

export async function PUT(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
  }

  // Author or Admin only
  if (post.authorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "수정 권한이 없습니다" }, { status: 403 });
  }

  const body = await req.json();

  const updated = await prisma.post.update({
    where: { id },
    data: {
      title: body.title ?? post.title,
      content: body.content ?? post.content,
      postType: body.postType ?? post.postType,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) {
    return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
  }

  // Author or Admin only
  if (post.authorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 });
  }

  // Soft delete
  await prisma.post.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
