import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; board?: string; period?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, board, period } = await searchParams;

  if (!q) {
    return (
      <div className="min-h-screen city-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">검색어를 입력해주세요</p>
          <Link href="/" className="text-blue-400 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Period filter
  let dateFrom: Date | undefined;
  const now = new Date();
  switch (period) {
    case "today":
      dateFrom = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      dateFrom = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      dateFrom = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      dateFrom = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
  }

  const where: any = {
    deletedAt: null,
    isHidden: false,
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ],
  };

  if (board) {
    where.boardType = board;
  }

  if (dateFrom) {
    where.createdAt = { gte: dateFrom };
  }

  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, nickname: true, profileImage: true } },
      _count: { select: { comments: true, likes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const boardNames: Record<string, string> = {
    FREE: "자유",
    NOTICE: "공지",
    QNA: "질문",
    RESOURCE: "자료",
  };

  return (
    <div className="min-h-screen city-bg">
      <div className="bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Link href="/">🌃</Link>
            <span>›</span>
            <span>검색</span>
            <span>›</span>
            <span className="text-white truncate">&ldquo;{q}&rdquo;</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <form method="GET" className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="검색어를 입력하세요..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/40"
            />
            <select
              name="board"
              defaultValue={board || ""}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value="">전체 게시판</option>
              <option value="FREE">자유게시판</option>
              <option value="NOTICE">공지사항</option>
              <option value="QNA">질문게시판</option>
              <option value="RESOURCE">자료실</option>
            </select>
            <select
              name="period"
              defaultValue={period || ""}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value="">전체 기간</option>
              <option value="today">오늘</option>
              <option value="week">1주</option>
              <option value="month">1개월</option>
              <option value="year">1년</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition"
            >
              검색
            </button>
          </form>
        </div>

        <p className="text-white/60 text-sm mb-4">
          &ldquo;{q}&rdquo; 검색 결과 {posts.length}개
        </p>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/40 text-lg mb-4">검색 결과가 없습니다</p>
            <Link href="/" className="text-blue-400 hover:underline">
              홈으로 돌아가기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`}>
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={post.boardType.toLowerCase() as "free" | "notice" | "qna" | "resource"}>
                      {boardNames[post.boardType]}
                    </Badge>
                    {post.postType !== "NORMAL" && (
                      <Badge variant={post.postType.toLowerCase() as "secret" | "anonymous"}>
                        {post.postType === "SECRET" ? "🔒" : "👤"}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-white font-medium">{post.title}</h3>
                  <p className="text-white/50 text-sm mt-1 line-clamp-2">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                    <span>
                      {post.postType === "ANONYMOUS"
                        ? "👤 익명"
                        : post.author.nickname}
                    </span>
                    <span>·</span>
                    <span>{formatDate(post.createdAt)}</span>
                    <span>·</span>
                    <span>💬 {post._count.comments}</span>
                    <span>·</span>
                    <span>❤️ {post._count.likes}</span>
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
