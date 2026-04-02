"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  author: { id: string; nickname: string; profileImage: string | null };
  _count: { likes: number };
  likes: { userId: string }[];
  replies: Comment[];
}

interface PostActionsProps {
  postId: string;
  initialLikes: number;
  initialComments: Comment[];
  initialIsLiked: boolean;
  currentUser: { id: string; role: string } | null;
}

const REPORT_REASONS = [
  { value: "ABUSE", label: "욕설/비방" },
  { value: "SPAM", label: "스팸/광고" },
  { value: "INAPPROPRIATE", label: "불건전한 내용" },
  { value: "PERSONAL_INFO", label: "개인정보 노출" },
  { value: "OTHER", label: "기타" },
];

export default function PostActions({
  postId,
  initialLikes,
  initialComments,
  initialIsLiked,
  currentUser,
}: PostActionsProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: string } | null>(null);
  const [reportReasons, setReportReasons] = useState<string[]>([]);
  const [reportMemo, setReportMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handlePostLike() {
    if (!currentUser) return;
    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    if (res.ok) {
      const data = await res.json();
      setIsLiked(data.liked);
      setLikes((prev) => (data.liked ? prev + 1 : prev - 1));
    }
  }

  async function handleCommentLike(commentId: string) {
    if (!currentUser) return;
    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              _count: { likes: c._count.likes + (data.liked ? 1 : -1) },
              likes: data.liked
                ? [...c.likes, { userId: currentUser.id }]
                : c.likes.filter((l) => l.userId !== currentUser.id),
            };
          }
          if (c.replies.some((r) => r.id === commentId)) {
            return {
              ...c,
              replies: c.replies.map((r) => {
                if (r.id === commentId) {
                  return {
                    ...r,
                    _count: { likes: r._count.likes + (data.liked ? 1 : -1) },
                    likes: data.liked
                      ? [...r.likes, { userId: currentUser.id }]
                      : r.likes.filter((l) => l.userId !== currentUser.id),
                  };
                }
                return r;
              }),
            };
          }
          return c;
        })
      );
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText, postId, isAnonymous }),
    });
    setSubmitting(false);
    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => [...prev, { ...newComment, replies: [] }]);
      setCommentText("");
      setIsAnonymous(false);
      router.refresh();
    }
  }

  async function handleSubmitReply(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText, postId, parentId, isAnonymous }),
    });
    setSubmitting(false);
    if (res.ok) {
      const newReply = await res.json();
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return { ...c, replies: [...c.replies, newReply] };
          }
          return c;
        })
      );
      setReplyTo(null);
      setReplyText("");
      setIsAnonymous(false);
      router.refresh();
    }
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportTarget || reportReasons.length === 0) return;
    setSubmitting(true);
    const body: any = {
      reason: reportReasons[0],
      reasons: reportReasons,
      memo: reportMemo,
    };
    if (reportTarget.type === "post") body.postId = reportTarget.id;
    else body.commentId = reportTarget.id;

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (res.ok) {
      setReportOpen(false);
      setReportReasons([]);
      setReportMemo("");
      alert("신고가 접수되었습니다.");
    }
  }

  function openReport(type: "post" | "comment", id: string) {
    setReportTarget({ type, id });
    setReportReasons([]);
    setReportMemo("");
    setReportOpen(true);
  }

  return (
    <>
      {/* Like Button */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <button
          onClick={handlePostLike}
          disabled={!currentUser}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            isLiked
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
          }`}
        >
          ❤️ {likes}
        </button>
        {currentUser && (
          <button
            onClick={() => openReport("post", postId)}
            className="ml-2 px-4 py-2 rounded-md text-sm font-medium bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 transition"
          >
            🚨 신고
          </button>
        )}
      </div>

      {/* Comments */}
      <section className="mt-8">
        <h2 className="text-white font-semibold mb-4">💬 댓글 {comments.length}</h2>

        {/* Comment Form */}
        {currentUser ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 작성해주세요..."
              className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder:text-white/40 resize-none min-h-[80px]"
              maxLength={1000}
            />
            <div className="flex items-center justify-between mt-2">
              {/* Anonymous Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-white/60 text-sm">👤 익명 댓글</span>
              </label>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !commentText.trim()}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {submitting ? "등록 중..." : "댓글 작성"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-white/50 text-sm mb-6">
            댓글을 작성하려면{" "}
            <a href="/login" className="text-blue-400 hover:underline">
              로그인
            </a>
            해주세요.
          </p>
        )}

        {/* Comment List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
              {/* Comment Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">
                    {comment.isAnonymous ? "👤 익명" : comment.author.nickname}
                  </span>
                  {comment.isAnonymous && (
                    <span className="text-white/30 text-xs">(비밀 댓글)</span>
                  )}
                </div>
                <span className="text-white/40 text-xs">{formatDateTime(comment.createdAt)}</span>
              </div>

              <p className="text-white/80 text-sm">{comment.content}</p>

              {/* Comment Actions */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => handleCommentLike(comment.id)}
                  disabled={!currentUser}
                  className={`text-xs px-2 py-1 rounded transition ${
                    comment.likes.length > 0
                      ? "text-red-400 bg-red-500/10"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  ❤️ {comment._count.likes}
                </button>
                {currentUser && (
                  <button
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="text-xs text-white/40 hover:text-white/60 transition px-2 py-1"
                  >
                    ↩ 답글
                  </button>
                )}
                {currentUser && (
                  <button
                    onClick={() => openReport("comment", comment.id)}
                    className="text-xs text-white/40 hover:text-red-400 transition px-2 py-1"
                  >
                    🚨 신고
                  </button>
                )}
              </div>

              {/* Reply Form */}
              {replyTo === comment.id && (
                <form
                  onSubmit={(e) => handleSubmitReply(e, comment.id)}
                  className="mt-3"
                >
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`@${comment.author.nickname}에게 답글...`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white placeholder:text-white/30 text-sm resize-none min-h-[60px]"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    {isAnonymous && (
                      <span className="text-white/30 text-xs">👤 익명 답글</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="text-xs text-white/40 hover:text-white/60 px-2 py-1"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !replyText.trim()}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition"
                    >
                      {submitting ? "..." : "답글"}
                    </button>
                  </div>
                </form>
              )}

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="mt-3 ml-4 pl-4 border-l border-white/10 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 text-xs">
                            ↳ {reply.isAnonymous ? "👤 익명" : reply.author.nickname}
                          </span>
                          {reply.isAnonymous && (
                            <span className="text-white/20 text-xs">(익명)</span>
                          )}
                        </div>
                        <span className="text-white/30 text-xs">{formatDateTime(reply.createdAt)}</span>
                      </div>
                      <p className="text-white/70 text-xs">{reply.content}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => handleCommentLike(reply.id)}
                          disabled={!currentUser}
                          className={`text-xs px-2 py-0.5 rounded transition ${
                            reply.likes.length > 0
                              ? "text-red-400 bg-red-500/10"
                              : "text-white/30 hover:text-white/50"
                          }`}
                        >
                          ❤️ {reply._count.likes}
                        </button>
                        {currentUser && (
                          <button
                            onClick={() => openReport("comment", reply.id)}
                            className="text-xs text-white/30 hover:text-red-400 transition px-2 py-0.5"
                          >
                            🚨
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-white font-bold text-lg mb-1">🚨 신고하기</h3>
            <p className="text-white/40 text-sm mb-4">
              신고 사유를 선택해주세요. 여러 사유를 선택할 수 있습니다.
            </p>
            <form onSubmit={handleReport}>
                {/* Checkbox Reasons */}
              <div className="space-y-2 mb-4">
                {REPORT_REASONS.map((reason) => (
                  <label key={reason.value} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={reportReasons.includes(reason.value)}
                      onChange={(e) => {
                        setReportReasons((prev) =>
                          e.target.checked
                            ? [...prev, reason.value]
                            : prev.filter((r) => r !== reason.value)
                        );
                      }}
                      className="w-4 h-4 accent-red-500"
                    />
                    <span className="text-white/70 group-hover:text-white text-sm">{reason.label}</span>
                  </label>
                ))}
              </div>
              {/* Memo */}
              <textarea
                value={reportMemo}
                onChange={(e) => setReportMemo(e.target.value)}
                placeholder="추가 설명 (선택)"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/30 text-sm resize-none mb-4"
                maxLength={500}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="px-4 py-2 rounded-md text-white/60 hover:text-white text-sm transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting || reportReasons.length === 0}
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm disabled:opacity-50 transition"
                >
                  {submitting ? "신고 중..." : "신고하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
