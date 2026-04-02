import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AUTO_HIDE_THRESHOLD = 5;

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { postId, commentId, reason, reasons, memo } = body;

    // Support both single reason and multiple reasons (checkboxes)
    const primaryReason = reason || (Array.isArray(reasons) ? reasons[0] : null);
    const allReasons = Array.isArray(reasons) ? reasons : reason ? [reason] : [];

    if (!postId && !commentId) {
      return NextResponse.json({ error: "신고 대상을 선택해주세요" }, { status: 400 });
    }

    if (!primaryReason) {
      return NextResponse.json({ error: "신고 사유를 선택해주세요" }, { status: 400 });
    }

    // Build memo with all selected reasons
    const reasonsLabel: Record<string, string> = {
      ABUSE: "욕설/비방",
      SPAM: "스팸/광고",
      INAPPROPRIATE: "불건전한 내용",
      PERSONAL_INFO: "개인정보 노출",
      OTHER: "기타",
    };
    const reasonsText = allReasons.map((r: string) => reasonsLabel[r] || r).join(", ");
    const fullMemo = reasonsText + (memo ? `\n${memo}` : "");

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
        reason: primaryReason,
        memo: fullMemo || undefined,
        status: "PENDING",
      },
    });

    // Auto-hide check for posts (5 unique reporters)
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
