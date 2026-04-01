import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    include: {
      author: { select: { id: true, nickname: true, profileImage: true, role: true } },
      board: true,
      files: true,
      likes: { where: { userId: session?.user?.id } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!post) {
    notFound();
  }

  // Secret post visibility check
  const isAuthor = session?.user?.id === post.authorId;
  const isAdmin = session?.user?.role === "ADMIN";

  if (post.postType === "SECRET" && !isAuthor && !isAdmin) {
    return (
      <div className="min-h-screen city-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">🔒 비밀글입니다</p>
          <Link href={`/board/${post.boardType}`} className="text-blue-400 hover:underline">
            게시판으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Hidden post check
  if (post.isHidden && !isAdmin && !isAuthor) {
    return (
      <div className="min-h-screen city-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">🚫 숨김 처리된 글입니다</p>
          <Link href={`/board/${post.boardType}`} className="text-blue-400 hover:underline">
            게시판으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Fetch comments
  const comments = await prisma.comment.findMany({
    where: { postId: id, deletedAt: null, parentId: null },
    include: {
      author: { select: { id: true, nickname: true, profileImage: true } },
      replies: {
        where: { deletedAt: null },
        include: {
          author: { select: { id: true, nickname: true, profileImage: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { likes: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const postTypeLabels: Record<string, { label: string; variant: "free" | "notice" | "qna" | "resource" | "secret" | "anonymous" }> = {
    NORMAL: { label: "일반글", variant: "free" },
    NOTICE: { label: "📌 공지", variant: "notice" },
    SECRET: { label: "🔒 비밀", variant: "secret" },
    ANONYMOUS: { label: "👤 익명", variant: "anonymous" },
  };

  const boardNames: Record<string, string> = {
    FREE: "자유게시판",
    NOTICE: "공지사항",
    QNA: "질문게시판",
    RESOURCE: "자료실",
  };

  const isLiked = post.likes.length > 0;

  return (
    <div className="min-h-screen city-bg">
      <div className="bg-black/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Link href="/">🌃</Link>
            <span>›</span>
            <Link href={`/board/${post.boardType}`}>{boardNames[post.boardType]}</Link>
            <span>›</span>
            <span className="text-white truncate">{post.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Post Content */}
        <article className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={postTypeLabels[post.postType].variant}>
                {postTypeLabels[post.postType].label}
              </Badge>
              {post.isHidden && <Badge variant="hidden">숨김</Badge>}
            </div>
            <div className="flex gap-2">
              {isAuthor && (
                <Link href={`/write/${post.id}`}>
                  <Button size="sm" variant="ghost" className="text-white/60 hover:text-white">
                    수정
                  </Button>
                </Link>
              )}
              {(isAuthor || isAdmin) && (
                <form action={`/api/posts/${post.id}?delete=true`} method="POST">
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                    삭제
                  </Button>
                </form>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">{post.title}</h1>

          <div className="flex items-center gap-3 text-sm text-white/60 mb-6">
            <span>
              {post.postType === "ANONYMOUS"
                ? "👤 익명"
                : post.author.nickname}
            </span>
            <span>·</span>
            <span>{formatDateTime(post.createdAt)}</span>
            <span>·</span>
            <span>💬 {post._count.comments}</span>
            <span>·</span>
            <span>❤️ {post._count.likes}</span>
          </div>

          {/* Files */}
          {post.files.length > 0 && (
            <div className="mb-6">
              <p className="text-white/60 text-sm mb-2">📎 첨부파일</p>
              <div className="flex flex-wrap gap-2">
                {post.files.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1 rounded-md border border-white/10"
                  >
                    {file.originalName}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="prose prose-invert max-w-none">
            <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          </div>

          {/* Like Button */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <form action={`/api/likes`} method="POST">
              <input type="hidden" name="postId" value={post.id} />
              <Button
                type="submit"
                variant={isLiked ? "default" : "outline"}
                className={isLiked ? "bg-red-500 hover:bg-red-400" : "border-white/20 text-white hover:bg-white/10"}
              >
                ❤️ {post._count.likes}
              </Button>
            </form>
          </div>
        </article>

        {/* Comments */}
        <section>
          <h2 className="text-white font-semibold mb-4">
            💬 댓글 {post._count.comments}
          </h2>

          {/* Comment Form */}
          {session?.user ? (
            <form action={`/api/comments`} method="POST" className="mb-6">
              <input type="hidden" name="postId" value={post.id} />
              <textarea
                name="content"
                placeholder="댓글을 작성해주세요..."
                className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder:text-white/40 resize-none min-h-[80px]"
                required
                maxLength={1000}
              />
              <div className="flex justify-end mt-2">
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500">
                  댓글 작성
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-white/50 text-sm mb-6">
              댓글을 작성하려면{" "}
              <Link href="/login" className="text-blue-400 hover:underline">
                로그인
              </Link>
              해주세요.
            </p>
          )}

          {/* Comment List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-white font-medium text-sm">
                    {comment.author.nickname}
                  </span>
                  <span className="text-white/40 text-xs">
                    {formatDateTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-white/80 text-sm">{comment.content}</p>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="mt-3 ml-4 pl-4 border-l border-white/10 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id}>
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-white/60 text-xs">
                            ↳ {reply.author.nickname}
                          </span>
                          <span className="text-white/30 text-xs">
                            {formatDateTime(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-white/70 text-xs">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
