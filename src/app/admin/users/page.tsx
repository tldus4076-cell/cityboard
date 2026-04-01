import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nickname: true,
      profileImage: true,
      role: true,
      isBlocked: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen city-bg">
      <div className="bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Link href="/">🌃</Link>
            <span>›</span>
            <Link href="/admin/dashboard">관리자</Link>
            <span>›</span>
            <span className="text-white">회원 관리</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">👥 회원 목록</h1>

        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr className="text-white/60 text-left">
                <th className="px-4 py-3 font-medium">회원</th>
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">권한</th>
                <th className="px-4 py-3 font-medium">활동</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="text-white hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-sm">
                        {user.profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.profileImage} className="w-full h-full rounded-full" alt="" />
                        ) : (
                          "👤"
                        )}
                      </div>
                      <span>{user.nickname}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.role === "ADMIN" ? (
                      <Badge variant="notice">관리자</Badge>
                    ) : (
                      <span className="text-white/40">회원</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    글 {user._count.posts} · 댓글 {user._count.comments}
                  </td>
                  <td className="px-4 py-3 text-white/40">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    {user.isBlocked ? (
                      <Badge variant="destructive">차단됨</Badge>
                    ) : (
                      <Badge variant="free">정상</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.role !== "ADMIN" && (
                      <div className="flex gap-2">
                        <form action={`/api/admin/users?userId=${user.id}&action=${user.isBlocked ? "unblock" : "block"}`} method="POST">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={
                              user.isBlocked
                                ? "text-green-400 hover:text-green-300"
                                : "text-red-400 hover:text-red-300"
                            }
                            type="submit"
                          >
                            {user.isBlocked ? "차단 해제" : "차단"}
                          </Button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
