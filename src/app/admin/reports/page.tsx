import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const reasonLabels: Record<string, string> = {
  ABUSE: "욕설/비방",
  SPAM: "스팸/광고",
  INAPPROPRIATE: "불건전한 내용",
  PERSONAL_INFO: "개인정보 노출",
  OTHER: "기타",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  RESOLVED: "bg-green-500/20 text-green-300 border-green-500/30",
  REJECTED: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default async function AdminReportsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { nickname: true } },
      post: {
        select: {
          id: true,
          title: true,
          isHidden: true,
          author: { select: { id: true, nickname: true } },
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
  });

  const pendingReports = reports.filter((r) => r.status === "PENDING");

  return (
    <div className="min-h-screen city-bg">
      <div className="bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Link href="/">🌃</Link>
            <span>›</span>
            <Link href="/admin/dashboard">관리자</Link>
            <span>›</span>
            <span className="text-white">신고 관리</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">🚨 신고 목록</h1>
          <Badge variant="notice" className="text-sm">
            미처리: {pendingReports.length}
          </Badge>
        </div>

        {reports.length === 0 ? (
          <p className="text-white/40 text-center py-16">신고가 없습니다</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={statusColors[report.status]}>
                        {report.status === "PENDING"
                          ? "대기중"
                          : report.status === "RESOLVED"
                          ? "처리됨"
                          : "기각"}
                      </Badge>
                      <Badge variant="destructive">{reasonLabels[report.reason]}</Badge>
                    </div>
                    <p className="text-white/40 text-xs">
                      신고자: {report.reporter.nickname} ·{" "}
                      {formatDateTime(report.createdAt)}
                    </p>
                  </div>

                  {report.post && (
                    <Link href={`/post/${report.post.id}`}>
                      <Button size="sm" variant="ghost" className="text-white/60 hover:text-white">
                        게시글 보기
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Target Content */}
                <div className="bg-black/20 rounded p-3 mb-3">
                  {report.post && (
                    <div>
                      <p className="text-white/40 text-xs mb-1">신고 대상 게시글</p>
                      <p className="text-white font-medium">{report.post.title}</p>
                      <p className="text-white/50 text-sm">by {report.post.author.nickname}</p>
                      {report.post.isHidden && (
                        <Badge variant="hidden" className="mt-1">숨김 처리됨</Badge>
                      )}
                    </div>
                  )}
                  {report.comment && (
                    <div>
                      <p className="text-white/40 text-xs mb-1">신고 대상 댓글</p>
                      <p className="text-white/80 text-sm">{report.comment.content}</p>
                      <p className="text-white/50 text-xs">by {report.comment.author.nickname}</p>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                {report.status === "PENDING" && (
                  <div className="flex gap-2">
                    <form action={`/api/admin/reports`} method="POST">
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="action" value="resolve" />
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-500 mr-2"
                        type="submit"
                      >
                        ✅ 복원
                      </Button>
                    </form>
                    <form action={`/api/admin/reports`} method="POST">
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="action" value="reject" />
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white/60"
                        type="submit"
                      >
                        기각
                      </Button>
                    </form>
                    <form action={`/api/admin/reports`} method="POST">
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="action" value="delete" />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        type="submit"
                      >
                        삭제
                      </Button>
                    </form>
                  </div>
                )}

                {report.memo && (
                  <p className="text-white/40 text-xs mt-2">
                    관리자 메모: {report.memo}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
