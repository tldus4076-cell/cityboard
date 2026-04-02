"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Post {
  id: string;
  title: string;
  content: string;
  boardType: string;
  postType: string;
  isHidden: boolean;
  createdAt: string;
  author: { id: string; nickname: string; profileImage: string | null };
  _count: { comments: number; likes: number };
}

const BOARD_INFO: Record<string, { name: string; icon: string; color: string; desc: string }> = {
  FREE: { name: "자유게시판", icon: "💬", color: "free", desc: "자유롭게 이야기를 나눠보세요" },
  NOTICE: { name: "공지사항", icon: "📢", color: "notice", desc: "중요한 안내 사항을 확인하세요" },
  QNA: { name: "질문게시판", icon: "❓", color: "qna", desc: "궁금한 것을 질문하고 답변을 구해보세요" },
  RESOURCE: { name: "자료실", icon: "📚", color: "resource", desc: "유용한 자료를 공유합니다" },
};

const postTypeLabels: Record<string, { label: string; variant: "free" | "notice" | "qna" | "resource" | "secret" | "anonymous" | "hidden" }> = {
  NORMAL: { label: "", variant: "free" },
  NOTICE: { label: "📌", variant: "notice" },
  SECRET: { label: "🔒", variant: "secret" },
  ANONYMOUS: { label: "👤", variant: "anonymous" },
};

const INITIAL_LIMIT = 20;

interface PostListProps {
  initialBoardType: string;
  initialPosts: Post[];
  totalCount: number;
  sessionUser: { id: string; role: string } | null;
}

export default function PostList({ initialBoardType, initialPosts, totalCount, sessionUser }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length < totalCount);

  const board = BOARD_INFO[initialBoardType] || BOARD_INFO.FREE;

  async function loadMore() {
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(
        `/api/posts?board=${initialBoardType}&page=${nextPage}&limit=${INITIAL_LIMIT}`
      );
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setPage(nextPage);
      setHasMore(data.posts.length > 0 && data.posts.length < data.limit);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Board Info */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-4xl">{board.icon}</span>
        <div>
          <h2 className="text-2xl font-bold text-white">{board.name}</h2>
          <p className="text-white/60 text-sm">{board.desc}</p>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {posts.map((post) => (
          <Link key={post.id} href={`/post/${post.id}`}>
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition cursor-pointer">
              {/* Top Row: Badges */}
              <div className="flex items-center gap-2 mb-2">
                {post.postType !== "NORMAL" && (
                  <Badge variant={postTypeLabels[post.postType]?.variant || "free"}>
                    {postTypeLabels[post.postType]?.label}
                    {post.postType === "SECRET" ? " 비밀글" : post.postType === "ANONYMOUS" ? " 익명글" : ""}
                  </Badge>
                )}
                {post.isHidden && (
                  <Badge variant="hidden">🚫 숨김</Badge>
                )}
              </div>

              {/* Title Row */}
              <div className="flex items-center gap-2">
                {/* 🔒 Lock icon for secret posts - title still shown */}
                {post.postType === "SECRET" && (
                  <span className="text-yellow-400 shrink-0" title="비밀글">🔒</span>
                )}
                <h3 className="text-white font-medium truncate">
                  {post.title}
                </h3>
              </div>

              {/* Content Preview */}
              <p className="text-white/50 text-sm mt-1 line-clamp-2">
                {post.content}
              </p>

              {/* Bottom Row */}
              <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                <div className="flex items-center gap-2">
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
            </div>
          </Link>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 text-center">
          <Button
            onClick={loadMore}
            disabled={loading}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            {loading ? "로딩 중..." : `더보기 (${posts.length}/${totalCount})`}
          </Button>
        </div>
      )}
    </div>
  );
}
