import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createReportSchema } from "@/lib/validators";
import { ReportStatus } from "@prisma/client";

const AUTO_HIDE_THRESHOLD = 5;

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { postId, commentId, reason, memo } = parsed.data;

    // Check if already reported by this user
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: session.user.id,
        ...(postId ? { postId } : { commentId }),
      },
    });

    if (existing) {
      return NextResponse.json({ error: "이미 신고한 내용입니다" }, { status: 409 });
    }

    // Create report
    await prisma.report.create({
      data: {
        reporterId: session.user.id,
        postId: postId || undefined,
        commentId: commentId || undefined,
        reason,
        memo,
        status: "PENDING",
      },
    });

    // Auto-hide check for posts
    if (postId) {
      const reportCount = await prisma.report.count({
        where: { postId, status: "PENDING" },
      });

      if (reportCount >= AUTO_HIDE_THRESHOLD) {
        await prisma.post.update({
          where: { id: postId },
          data: { isHidden: true, hiddenAt: new Date() },
        });
      }
    }

    return NextResponse.json({ success: true, message: "신고가 접수되었습니다" });
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
