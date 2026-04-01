import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const BOARD_INFO = {
  FREE: { name: "자유게시판", icon: "💬", color: "free", desc: "자유롭게 이야기를 나눠보세요" },
  NOTICE: { name: "공지사항", icon: "📢", color: "notice", desc: "중요한 안내 사항을 확인하세요" },
  QNA: { name: "질문게시판", icon: "❓", color: "qna", desc: "궁금한 것을 질문하고 답변을 구해보세요" },
  RESOURCE: { name: "자료실", icon: "📚", color: "resource", desc: "유용한 자료를 공유합니다" },
} as const;

type BoardType = keyof typeof BOARD_INFO;

interface PageProps {
  params: Promise<{ type: string }>;
}

export default async function BoardPage({ params }: PageProps) {
  const { type } = await params;
  const boardType = type.toUpperCase() as BoardType;

  if (!BOARD_INFO[boardType]) {
    return (
      <div className="min-h-screen city-bg flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl mb-4">존재하지 않는 게시판입니다</h1>
          <Link href="/" className="text-blue-400 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const board = BOARD_INFO[boardType];
  const session = await auth();

  // Fetch posts
  const posts = await prisma.post.findMany({
    where: {
      boardType,
      deletedAt: null,
      // 숨김 글은 관리자와 작성자만 볼 수 있음
      OR: [
        { isHidden: false },
        session?.user?.role === "ADMIN" ? {} : { authorId: session?.user?.id },
      ],
    },
    include: {
      author: { select: { id: true, nickname: true, profileImage: true } },
      _count: { select: { comments: true, likes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const postTypeLabels: Record<string, string> = {
    NORMAL: "",
    NOTICE: "📌",
    SECRET: "🔒",
    ANONYMOUS: "👤",
  };

  return (
    <div className="min-h-screen city-bg">
      <div className="bg-black/60 backdrop-blur-sm">
        {/* Header */}
        <header className="border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xl">🌃</Link>
              <span className="text-white/60">›</span>
              <span className="text-white font-medium">{board.name}</span>
            </div>
            <div className="flex items-center gap-3">
              {session?.user ? (
                <Link href="/mypage">
                  <span className="text-sm text-white/70">{session.user.name}</span>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                    로그인
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Board Info */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-5xl">{board.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-white">{board.name}</h1>
              <p className="text-white/60">{board.desc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <span className="text-white/60 text-sm">
            {posts.length}개의 글
          </span>
          {(session?.user || boardType !== "RESOURCE") && (
            <Link href={`/write?board=${boardType}`}>
              <Button className="bg-blue-600 hover:bg-blue-500">글쓰기</Button>
            </Link>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/40 text-lg mb-4">아직 글이 없습니다</p>
            <Link href={`/write?board=${boardType}`}>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                첫 글 작성하기
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`}>
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {post.postType !== "NORMAL" && (
                          <Badge variant={post.postType.toLowerCase() as "secret" | "anonymous" | "notice"}>
                            {postTypeLabels[post.postType]}
                          </Badge>
                        )}
                        {post.isHidden && (
                          <Badge variant="hidden">숨김</Badge>
                        )}
                      </div>
                      <h3 className="text-white font-medium truncate">
                        {post.title}
                      </h3>
                      <p className="text-white/50 text-sm mt-1 line-clamp-2">
                        {post.content}
                      </p>
                    </div>
                    <div className="text-right text-xs text-white/40 shrink-0">
                      <p>{post._count.comments} 💬</p>
                      <p>{post._count.likes} ❤️</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                    <span>
                      {post.postType === "ANONYMOUS"
                        ? "👤 익명"
                        : post.author.nickname}
                    </span>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
