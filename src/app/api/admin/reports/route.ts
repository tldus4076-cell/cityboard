import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminActionType } from "@prisma/client";

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

  return NextResponse.json({ reports, total, page, limit });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자만 접근 가능합니다" }, { status: 403 });
  }

  const { reportId, action, memo } = await req.json();

  const report = await prisma.report.findUnique({ where: { id: reportId } });

  if (!report) {
    return NextResponse.json({ error: "신고를 찾을 수 없습니다" }, { status: 404 });
  }

  if (action === "resolve") {
    // Restore content
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

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        action: report.postId ? "RESTORE_POST" : "DELETE_COMMENT",
        targetType: report.postId ? "Post" : "Comment",
        targetId: report.postId || report.commentId || "",
        memo,
      },
    });
  } else if (action === "reject") {
    // Keep content but mark report as rejected
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
        memo: "신고 기각",
      },
    });
  } else if (action === "delete") {
    // Permanently delete content
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "REJECTED", resolvedAt: new Date(), memo },
    });

    if (report.postId) {
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
          memo,
        },
      });
    }
    if (report.commentId) {
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
          memo,
        },
      });
    }
  } else {
    return NextResponse.json({ error: "유효하지 않은 action입니다" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
