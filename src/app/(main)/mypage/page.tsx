import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function MypagePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [userPosts, userComments, bookmarks] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: { select: { comments: true, likes: true } },
      },
    }),
    prisma.comment.findMany({
      where: { authorId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        post: { select: { id: true, title: true } },
      },
    }),
    prisma.bookmark.findMany({
      where: { userId: session.user.id },
      include: {
        post: {
          include: {
            author: { select: { id: true, nickname: true } },
            _count: { select: { comments: true, likes: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen city-bg">
      <div className="bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Link href="/">🌃</Link>
              <span>›</span>
              <span>마이페이지</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/30 flex items-center justify-center text-2xl">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} className="w-full h-full rounded-full" alt="" />
                ) : (
                  "👤"
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{session.user.name}</h2>
                <p className="text-white/60 text-sm">{session.user.email}</p>
                <p className="text-white/40 text-xs mt-1">
                  역할: {session.user.role === "ADMIN" ? "관리자" : "회원"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Posts */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">📝 내 글</CardTitle>
            </CardHeader>
            <CardContent>
              {userPosts.length === 0 ? (
                <p className="text-white/40 text-sm">작성한 글이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {userPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/post/${post.id}`}
                      className="block hover:bg-white/5 rounded p-2 -mx-2 transition"
                    >
                      <p className="text-white text-sm truncate">{post.title}</p>
                      <p className="text-white/40 text-xs mt-1">
                        {formatDate(post.createdAt)} · 💬{post._count.comments} · ❤️{post._count.likes}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Comments */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">💬 내 댓글</CardTitle>
            </CardHeader>
            <CardContent>
              {userComments.length === 0 ? (
                <p className="text-white/40 text-sm">작성한 댓글이 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {userComments.map((comment) => (
                    <Link
                      key={comment.id}
                      href={`/post/${comment.postId}`}
                      className="block hover:bg-white/5 rounded p-2 -mx-2 transition"
                    >
                      <p className="text-white text-sm truncate">Re: {comment.post.title}</p>
                      <p className="text-white/60 text-xs mt-1 truncate">{comment.content}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bookmarks */}
          <Card className="bg-white/5 border-white/10 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-white text-lg">🔖 북마크</CardTitle>
            </CardHeader>
            <CardContent>
              {bookmarks.length === 0 ? (
                <p className="text-white/40 text-sm">북마크한 글이 없습니다</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bookmarks.map((bm) => (
                    <Link
                      key={bm.id}
                      href={`/post/${bm.postId}`}
                      className="hover:bg-white/5 rounded p-3 -mx-3 transition border border-white/5"
                    >
                      <p className="text-white text-sm truncate">{bm.post.title}</p>
                      <p className="text-white/40 text-xs mt-1">
                        by {bm.post.author.nickname} · 💬{bm.post._count.comments}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
