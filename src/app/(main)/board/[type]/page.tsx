import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import PostList from "@/components/posts/post-list";

const BOARD_INFO: Record<string, { name: string; icon: string; color: string; desc: string }> = {
  FREE: { name: "자유게시판", icon: "💬", color: "free", desc: "자유롭게 이야기를 나눠보세요" },
  NOTICE: { name: "공지사항", icon: "📢", color: "notice", desc: "중요한 안내 사항을 확인하세요" },
  QNA: { name: "질문게시판", icon: "❓", color: "qna", desc: "궁금한 것을 질문하고 답변을 구해보세요" },
  RESOURCE: { name: "자료실", icon: "📚", color: "resource", desc: "유용한 자료를 공유합니다" },
};

type BoardType = keyof typeof BOARD_INFO;

interface PageProps {
  params: Promise<{ type: string }>;
}

export default async function BoardPage({ params }: PageProps) {
  const { type } = await params;
  const boardType = (type.toUpperCase() as BoardType) || "FREE";

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

  const session = await auth();
  const board = BOARD_INFO[boardType];

  // Initial posts for SSR (first page)
  const LIMIT = 20;
  const where: any = {
    deletedAt: null,
    boardType,
    OR: [
      { isHidden: false },
      session?.user?.role === "ADMIN"
        ? {}
        : session?.user?.id
        ? { authorId: session.user.id }
        : { authorId: "__none__" },
    ],
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, nickname: true, profileImage: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    prisma.post.count({ where }),
  ]);

  const sessionUser = session?.user
    ? { id: session.user.id, role: session.user.role }
    : null;

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xl">🌃</Link>
              <span className="text-white/40">›</span>
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
        </div>
      </div>

      {/* Board Selection Tabs */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex gap-2 flex-wrap">
          {Object.entries(BOARD_INFO).map(([key, info]) => (
            <Link key={key} href={`/board/${key}`}>
              <span className={`px-3 py-1.5 rounded-md text-sm transition ${
                boardType === key
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}>
                {info.icon} {info.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Write Button */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/50 text-sm">{total}개의 글</span>
          {(session?.user || boardType !== "RESOURCE") && (
            <Link href={`/write?board=${boardType}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500">글쓰기</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Post List (client component with load more) */}
      <PostList
        initialBoardType={boardType}
        initialPosts={posts as any}
        totalCount={total}
        sessionUser={sessionUser as any}
      />

      {/* Empty State */}
      {total === 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-8 text-center py-16">
          <p className="text-white/40 text-lg mb-4">아직 글이 없습니다</p>
          {session?.user && (
            <Link href={`/write?board=${boardType}`}>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                첫 글 작성하기
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
