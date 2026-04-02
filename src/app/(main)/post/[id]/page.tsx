import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import PostActions from "@/components/posts/post-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const userId = session?.user?.id;

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    include: {
      author: { select: { id: true, nickname: true, profileImage: true, role: true } },
      board: true,
      files: true,
      likes: userId ? { where: { userId } } : false,
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!post) {
    notFound();
  }

  // Secret post visibility check
  const isAuthor = userId === post.authorId;

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
    where: { postId: id, parentId: null, ...(isAdmin ? {} : { deletedAt: null }) },
    include: {
      author: { select: { id: true, nickname: true, profileImage: true } },
      _count: { select: { likes: true } },
      likes: userId ? { where: { userId } } : false,
      replies: {
        where: isAdmin ? {} : { deletedAt: null },
        include: {
          author: { select: { id: true, nickname: true, profileImage: true } },
          _count: { select: { likes: true } },
          likes: userId ? { where: { userId } } : false,
        },
        orderBy: { createdAt: "asc" },
      },
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

  const isLiked = post.likes && post.likes.length > 0;
  const currentUser = session?.user ? { id: session.user.id, role: session.user.role } : null;

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
                  <button className="text-white/60 hover:text-white text-sm px-3 py-1 rounded hover:bg-white/10 transition">
                    수정
                  </button>
                </Link>
              )}
              {(isAuthor || isAdmin) && (
                <form action={`/api/posts/${post.id}?delete=true`} method="POST">
                  <button type="submit" className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded hover:bg-red-500/10 transition">
                    삭제
                  </button>
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
            <span>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
            <span>·</span>
            <span>💬 {post._count.comments}</span>
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

          {/* Post Actions (Client Component) */}
          <PostActions
            postId={post.id}
            initialLikes={post._count.likes}
            initialComments={comments as any}
            initialIsLiked={isLiked}
            currentUser={currentUser}
          />
        </article>
      </div>
    </div>
  );
}
