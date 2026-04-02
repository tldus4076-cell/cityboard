import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

const actionLabels: Record<string, string> = {
  DELETE_POST: "게시글 삭제",
  RESTORE_POST: "게시글 복원",
  HIDE_POST: "게시글 숨김",
  UNHIDE_POST: "게시글 표시",
  BLOCK_USER: "회원 정지",
  UNBLOCK_USER: "정지 해제",
  DELETE_COMMENT: "댓글 삭제",
  REVEAL_ANONYMOUS_AUTHOR: "匿名作者 확인",
  PROCESS_REPORT: "신고 처리",
};

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [
    totalUsers,
    todayUsers,
    totalPosts,
    todayPosts,
    pendingReports,
    totalReports,
    recentSignups,
    recentReports,
    recentAdminActions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.post.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.count(),
    // Recent signups (last 5)
    prisma.user.findMany({
      select: { id: true, nickname: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Recent reports (last 5)
    prisma.report.findMany({
      where: { status: "PENDING" },
      include: {
        reporter: { select: { nickname: true } },
        post: { select: { title: true } },
        comment: { select: { content: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Recent admin actions (last 10)
    prisma.adminAction.findMany({
      include: {
        admin: { select: { nickname: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Popular posts (by likes)
  const popularPosts = await prisma.post.findMany({
    where: { deletedAt: null },
    include: {
      author: { select: { nickname: true } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { likes: { _count: "desc" } },
    take: 5,
  });

  return (
    <div className="min-h-screen city-bg">
      <div className="bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Link href="/">🌃</Link>
            <span>›</span>
            <span>관리자</span>
            <span>›</span>
            <span className="text-white">대시보드</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">📊 관리자 대시보드</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <p className="text-white/60 text-sm">전체 회원</p>
              <p className="text-3xl font-bold text-white mt-1">{totalUsers}</p>
              <p className="text-green-400 text-xs mt-1">+{todayUsers} 오늘</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <p className="text-white/60 text-sm">전체 게시글</p>
              <p className="text-3xl font-bold text-white mt-1">{totalPosts}</p>
              <p className="text-green-400 text-xs mt-1">+{todayPosts} 오늘</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <p className="text-white/60 text-sm">미처리 신고</p>
              <p className="text-3xl font-bold text-yellow-400 mt-1">{pendingReports}</p>
              <p className="text-white/40 text-xs mt-1">/{totalReports} 전체</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <p className="text-white/60 text-sm">전체 신고</p>
              <p className="text-3xl font-bold text-white mt-1">{totalReports}</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { href: "/admin/users", label: "👥 회원 관리", desc: "회원 목록, 정지" },
            { href: "/admin/reports", label: "🚨 신고 관리", desc: "신고 검토, 처리" },
            { href: "/admin/board", label: "📋 게시판 관리", desc: "공지, 자료실" },
            { href: "/admin/stats", label: "📈 통계", desc: "인기글, 현황" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition"
            >
              <p className="text-white font-medium">{item.label}</p>
              <p className="text-white/40 text-xs mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>

        {/* Two-column layout for recent activity */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Recent Signups */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm">👋 최근 가입</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSignups.length === 0 ? (
                <p className="text-white/40 text-xs">아직 회원이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {recentSignups.map((user) => (
                    <div key={user.id} className="flex items-center justify-between text-sm">
                      <span className="text-white/80">{user.nickname}</span>
                      <span className="text-white/40 text-xs">{formatDateTime(user.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Pending Reports */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm">🚨 미처리 신고</CardTitle>
            </CardHeader>
            <CardContent>
              {recentReports.length === 0 ? (
                <p className="text-white/40 text-xs">미처리 신고가 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {recentReports.map((report) => (
                    <div key={report.id} className="text-sm">
                      <p className="text-white/80 truncate">
                        {report.post?.title || report.comment?.content || "알 수 없음"}
                      </p>
                      <p className="text-white/40 text-xs">
                        by {report.reporter.nickname} · {formatDateTime(report.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Admin Actions */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-sm">📝 최근 관리 활동</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAdminActions.length === 0 ? (
              <p className="text-white/40 text-xs">아직 관리 활동이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {recentAdminActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">•</span>
                      <span className="text-white/80">{actionLabels[action.action] || action.action}</span>
                      <span className="text-white/40 text-xs">by {action.admin.nickname}</span>
                    </div>
                    <span className="text-white/40 text-xs">{formatDateTime(action.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Posts */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">🔥 인기 게시글 (좋아요 기준)</CardTitle>
          </CardHeader>
          <CardContent>
            {popularPosts.length === 0 ? (
              <p className="text-white/40 text-sm">아직 게시글이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {popularPosts.map((post, i) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 hover:bg-white/5 rounded p-2 -mx-2 transition cursor-pointer"
                  >
                    <span className="text-2xl font-bold text-white/20 w-8">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <Link href={`/post/${post.id}`} className="text-white text-sm hover:underline">
                        {post.title}
                      </Link>
                      <p className="text-white/40 text-xs mt-0.5">
                        by {post.author.nickname}
                      </p>
                    </div>
                    <div className="text-right text-xs text-white/40">
                      <p>❤️ {post._count.likes}</p>
                      <p>💬 {post._count.comments}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}