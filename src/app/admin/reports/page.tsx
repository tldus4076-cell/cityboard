"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const reasonLabels: Record<string, string> = {
  ABUSE: "욕설/비방",
  SPAM: "스팸/광고",
  INAPPROPRIATE: "불건전한 내용",
  PERSONAL_INFO: "개인정보 노출",
  OTHER: "기타",
};

const statusLabels: Record<string, string> = {
  PENDING: "대기중",
  RESOLVED: "처리됨",
  REJECTED: "기각",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  RESOLVED: "bg-green-500/20 text-green-300 border-green-500/30",
  REJECTED: "bg-red-500/20 text-red-300 border-red-500/30",
};

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

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const limit = 10;

  useEffect(() => {
    fetchReports();
  }, [page, status]);

  async function fetchReports() {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status !== "all" && { status }),
    });

    const res = await fetch(`/api/admin/reports?${params}`);
    const data = await res.json();
    setReports(data.reports || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function handleAction(reportId: string, action: string, memo?: string, suspendDuration?: number) {
    setActionLoading(true);
    const body: any = { reportId, action };
    if (memo) body.memo = memo;
    if (suspendDuration) body.suspendDuration = suspendDuration;

    const res = await fetch("/api/admin/reports", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSelectedReport(null);
      fetchReports();
    } else {
      const data = await res.json();
      alert(data.error || "오류가 발생했습니다");
    }
    setActionLoading(false);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen city-bg">
      <div className="bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Link href="/">🌃</Link>
            <span>›</span>
            <Link href="/admin/dashboard">관리자</Link>
            <span>›</span>
            <span className="text-white">신고 관리</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">🚨 신고 목록</h1>
          <div className="flex gap-2">
            {["all", "PENDING", "RESOLVED", "REJECTED"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-sm ${
                  status === s
                    ? "bg-white/20 text-white"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {s === "all" ? "전체" : statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-white/40 text-center py-16">로딩 중...</p>
        ) : reports.length === 0 ? (
          <p className="text-white/40 text-center py-16">신고가 없습니다</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/8 transition cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={statusColors[report.status]}>
                        {statusLabels[report.status]}
                      </Badge>
                      <Badge variant="destructive">{reasonLabels[report.reason]}</Badge>
                    </div>
                    <p className="text-white/40 text-xs">
                      신고자: {report.reporter.nickname} ·{" "}
                      {formatDateTime(report.createdAt)}
                    </p>
                  </div>

                  <div className="text-white/60 text-sm">
                    {report.post && <span>📝 {report.post.title}</span>}
                    {report.comment && <span>💬 {(report.comment.content as string).substring(0, 30)}...</span>}
                  </div>
                </div>

                {/* Admin Actions */}
                {report.status === "PENDING" && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-500"
                      onClick={() => handleAction(report.id, "resolve", "원문 복원")}
                    >
                      ✅ 복원
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white/60"
                      onClick={() => handleAction(report.id, "reject", "신고 기각")}
                    >
                      기각
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => handleAction(report.id, "delete", "신고로 삭제")}
                    >
                      🗑️ 삭제
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-orange-400 hover:text-orange-300"
                      onClick={() => {
                        if (confirm("삭제 + 7일 정지 처리하시겠습니까?")) {
                          handleAction(report.id, "delete_and_suspend", "신고로 인한 삭제 및 정지", 7);
                        }
                      }}
                    >
                      🚫 삭제+정지
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="text-white"
            >
              이전
            </Button>
            <span className="text-white/60 text-sm py-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="text-white"
            >
              다음
            </Button>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">📋 신고 상세</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-white/40 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Report Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[selectedReport.status]}>
                    {statusLabels[selectedReport.status]}
                  </Badge>
                  <Badge variant="destructive">{reasonLabels[selectedReport.reason]}</Badge>
                </div>

                <div className="text-sm text-white/60">
                  <p>신고자: {selectedReport.reporter.nickname}</p>
                  <p>신고일: {formatDateTime(selectedReport.createdAt)}</p>
                </div>

                {/* Reported Content */}
                <div className="bg-black/30 rounded p-4">
                  <p className="text-white/40 text-xs mb-2">신고 대상</p>
                  {selectedReport.post && (
                    <div>
                      <p className="text-white font-medium">{selectedReport.post.title}</p>
                      <p className="text-white/70 text-sm mt-1">{selectedReport.post.content}</p>
                      <p className="text-white/40 text-xs mt-2">
                        작성자: {selectedReport.post.author.nickname}
                      </p>
                    </div>
                  )}
                  {selectedReport.comment && (
                    <div>
                      <p className="text-white/80">{selectedReport.comment.content}</p>
                      <p className="text-white/40 text-xs mt-2">
                        작성자: {selectedReport.comment.author.nickname}
                      </p>
                    </div>
                  )}
                </div>

                {/* Memo */}
                {selectedReport.memo && (
                  <div className="bg-black/30 rounded p-4">
                    <p className="text-white/40 text-xs mb-1">신고 메모</p>
                    <p className="text-white/80 text-sm">{selectedReport.memo}</p>
                  </div>
                )}

                {/* Handling History */}
                <div>
                  <p className="text-white/40 text-xs mb-2">처리 이력</p>
                  {selectedReport.history && selectedReport.history.length > 0 ? (
                    <div className="space-y-2">
                      {selectedReport.history.map((h: any, i: number) => (
                        <div key={i} className="text-sm bg-white/5 rounded p-2">
                          <p className="text-white/80">
                            {actionLabels[h.action] || h.action}
                          </p>
                          <p className="text-white/40 text-xs">
                            {h.admin.nickname} · {formatDateTime(h.createdAt)}
                          </p>
                          {h.memo && <p className="text-white/60 text-xs mt-1">{h.memo}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">처리 이력이 없습니다</p>
                  )}
                </div>

                {/* Actions */}
                {selectedReport.status === "PENDING" && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                    <Button
                      className="bg-green-600 hover:bg-green-500"
                      onClick={() => {
                        const memo = prompt("메모를 입력하세요 (선택사항):");
                        handleAction(selectedReport.id, "resolve", memo || "원문 복원");
                      }}
                      disabled={actionLoading}
                    >
                      ✅ 복원
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/20 text-white/60"
                      onClick={() => {
                        const memo = prompt("사유를 입력하세요:");
                        if (memo !== null) {
                          handleAction(selectedReport.id, "reject", memo);
                        }
                      }}
                      disabled={actionLoading}
                    >
                      기각
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => {
                        const memo = prompt("사유를 입력하세요 (선택사항):");
                        handleAction(selectedReport.id, "delete", memo || "신고로 삭제");
                      }}
                      disabled={actionLoading}
                    >
                      🗑️ 삭제
                    </Button>
                    <div className="flex gap-1">
                      {[7, 30, 90].map((days) => (
                        <Button
                          key={days}
                          variant="ghost"
                          className="text-orange-400 hover:text-orange-300"
                          onClick={() => {
                            const memo = prompt("사유를 입력하세요 (선택사항):");
                            handleAction(
                              selectedReport.id,
                              "delete_and_suspend",
                              memo || `신고로 인한 삭제 및 ${days}일 정지`,
                              days
                            );
                          }}
                          disabled={actionLoading}
                        >
                          🚫 +{days}일
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}