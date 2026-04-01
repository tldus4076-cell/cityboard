import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 접근 가능합니다" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { email: { contains: search } },
          { nickname: { contains: search } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        nickname: true,
        profileImage: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        _count: {
          select: { posts: true, comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 접근 가능합니다" }, { status: 403 });
  }

  const { userId, action } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId가 필요합니다" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "자기 자신의 상태를 변경할 수 없습니다" }, { status: 400 });
  }

  if (action === "block") {
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });
    await prisma.userBlock.create({
      data: { blockedId: userId, blockedById: session.user.id },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "unblock") {
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
    });
    await prisma.userBlock.deleteMany({
      where: { blockedId: userId, blockedById: session.user.id },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "유효하지 않은 action입니다" }, { status: 400 });
}
