import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 접근 가능합니다" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where = status ? { status: status as any } : {};

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, nickname: true } },
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            author: { select: { id: true, nickname: true } },
            isHidden: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, nickname: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  // Get handling history for each report
  const reportsWithHistory = await Promise.all(
    reports.map(async (report) => {
      const history = await prisma.adminAction.findMany({
        where: {
          targetId: report.id,
          action: { in: ["PROCESS_REPORT", "DELETE_POST", "DELETE_COMMENT", "RESTORE_POST", "RESTORE_COMMENT", "BLOCK_USER"] },
        },
        include: {
          admin: { select: { nickname: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      return { ...report, history };
    })
  );

  return NextResponse.json({ reports: reportsWithHistory, total, page, limit });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 접근 가능합니다" }, { status: 403 });
  }

  const { reportId, action, memo, suspendDuration } = await req.json();

  const report = await prisma.report.findUnique({ where: { id: reportId } });

  if (!report) {
    return NextResponse.json({ error: "신고를 찾을 수 없습니다" }, { status: 404 });
  }

  if (action === "resolve") {
    // Restore content (신고 판단 - 원문 복원)
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "RESOLVED", resolvedAt: new Date(), memo },
    });

    if (report.postId) {
      await prisma.post.update({
        where: { id: report.postId },
        data: { isHidden: false, hiddenAt: null },
      });
    }
    if (report.commentId) {
      await prisma.comment.update({
        where: { id: report.commentId },
        data: { isHidden: false },
      });
    }

    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        action: "PROCESS_REPORT",
        targetType: "Report",
        targetId: reportId,
        memo: memo || "신고 판단: 원문 복원",
      },
    });
  } else if (action === "reject") {
    // Keep content but mark report as rejected (기각)
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "REJECTED", resolvedAt: new Date(), memo },
    });

    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        action: "PROCESS_REPORT",
        targetType: "Report",
        targetId: reportId,
        memo: memo || "신고 기각",
      },
    });
  } else if (action === "delete") {
    // Permanently delete content (삭제)
    let targetAuthorId: string | null = null;

    if (report.postId) {
      const post = await prisma.post.findUnique({ where: { id: report.postId } });
      targetAuthorId = post?.authorId || null;

      await prisma.post.update({
        where: { id: report.postId },
        data: { deletedAt: new Date() },
      });
      await prisma.adminAction.create({
        data: {
          adminId: session.user.id,
          action: "DELETE_POST",
          targetType: "Post",
          targetId: report.postId,
          memo: memo || "신고로 인한 삭제",
        },
      });
    }
    if (report.commentId) {
      const comment = await prisma.comment.findUnique({ where: { id: report.commentId } });
      targetAuthorId = comment?.authorId || null;

      await prisma.comment.update({
        where: { id: report.commentId },
        data: { deletedAt: new Date() },
      });
      await prisma.adminAction.create({
        data: {
          adminId: session.user.id,
          action: "DELETE_COMMENT",
          targetType: "Comment",
          targetId: report.commentId,
          memo: memo || "신고로 인한 삭제",
        },
      });
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { status: "RESOLVED", resolvedAt: new Date(), memo },
    });
  } else if (action === "delete_and_suspend") {
    // Delete content AND suspend the author
    let targetAuthorId: string | null = null;

    if (report.postId) {
      const post = await prisma.post.findUnique({ where: { id: report.postId } });
      targetAuthorId = post?.authorId || null;

      await prisma.post.update({
        where: { id: report.postId },
        data: { deletedAt: new Date() },
      });
      await prisma.adminAction.create({
        data: {
          adminId: session.user.id,
          action: "DELETE_POST",
          targetType: "Post",
          targetId: report.postId,
          memo: memo || "신고로 인한 삭제 및 정지",
        },
      });
    }
    if (report.commentId) {
      const comment = await prisma.comment.findUnique({ where: { id: report.commentId } });
      targetAuthorId = comment?.authorId || null;

      await prisma.comment.update({
        where: { id: report.commentId },
        data: { deletedAt: new Date() },
      });
      await prisma.adminAction.create({
        data: {
          adminId: session.user.id,
          action: "DELETE_COMMENT",
          targetType: "Comment",
          targetId: report.commentId,
          memo: memo || "신고로 인한 삭제 및 정지",
        },
      });
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { status: "RESOLVED", resolvedAt: new Date(), memo },
    });

    // Suspend the author
    if (targetAuthorId) {
      const days = suspendDuration ? parseInt(suspendDuration) : 7;
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + days);

      await prisma.user.update({
        where: { id: targetAuthorId },
        data: { isBlocked: true, suspendedUntil },
      });

      await prisma.userBlock.create({
        data: {
          blockedId: targetAuthorId,
          blockedById: session.user.id,
          reason: `신고로 인한 ${days}일 정지`,
        },
      });

      await prisma.adminAction.create({
        data: {
          adminId: session.user.id,
          action: "BLOCK_USER",
          targetType: "User",
          targetId: targetAuthorId,
          memo: `신고 처리로 인한 ${days}일 정지 (${suspendedUntil.toLocaleDateString("ko-KR")}까지)`,
        },
      });
    }
  } else {
    return NextResponse.json({ error: "유효하지 않은 action입니다" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}