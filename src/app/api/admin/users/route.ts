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
  const status = searchParams.get("status"); // all | normal | blocked | suspended
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (search) {
    where.OR = [
      { email: { contains: search } },
      { nickname: { contains: search } },
    ];
  }

  if (status === "blocked") {
    where.isBlocked = true;
  } else if (status === "suspended") {
    where.isBlocked = true;
    where.suspendedUntil = { gt: new Date() };
  } else if (status === "normal") {
    where.OR = [
      { isBlocked: false },
      { isBlocked: true, suspendedUntil: { lt: new Date() } },
    ];
  }

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
        suspendedUntil: true,
        lastLoginAt: true,
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

  // For each user, get additional stats
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      // Count reports filed against this user (via their posts and comments)
      const [postReports, commentReports] = await Promise.all([
        prisma.report.count({
          where: { post: { authorId: user.id } },
        }),
        prisma.report.count({
          where: { comment: { authorId: user.id } },
        }),
      ]);

      // Count how many times this user was blocked (admin actions)
      const suspensionCount = await prisma.adminAction.count({
        where: {
          targetId: user.id,
          action: "BLOCK_USER",
        },
      });

      // Count blocked users by this user
      const blockedCount = await prisma.userBlock.count({
        where: { blockedById: user.id },
      });

      // Get OAuth provider info
      const account = await prisma.account.findFirst({
        where: { userId: user.id },
        select: { provider: true },
      });

      return {
        ...user,
        reportCount: postReports + commentReports,
        suspensionCount,
        blockedCount,
        loginProvider: account?.provider || "credentials",
      };
    })
  );

  return NextResponse.json({ users: usersWithStats, total, page, limit });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 접근 가능합니다" }, { status: 403 });
  }

  const { userId, action, duration } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId가 필요합니다" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "자기 자신의 상태를 변경할 수 없습니다" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다" }, { status: 404 });
  }

  if (action === "block") {
    // Calculate suspended until date based on duration (in days)
    const days = duration ? parseInt(duration) : 7; // default 7 days
    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + days);

    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true, suspendedUntil },
    });

    await prisma.userBlock.create({
      data: {
        blockedId: userId,
        blockedById: session.user.id,
        reason: `${days}일 정지`,
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        action: "BLOCK_USER",
        targetType: "User",
        targetId: userId,
        memo: `${days}일 정지 (${suspendedUntil.toLocaleDateString("ko-KR")}까지)`,
      },
    });

    return NextResponse.json({
      success: true,
      suspendedUntil: suspendedUntil.toISOString(),
    });
  }

  if (action === "unblock") {
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false, suspendedUntil: null },
    });

    await prisma.userBlock.deleteMany({
      where: { blockedId: userId },
    });

    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        action: "UNBLOCK_USER",
        targetType: "User",
        targetId: userId,
        memo: "즉시 해제",
      },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "유효하지 않은 action입니다" }, { status: 400 });
}