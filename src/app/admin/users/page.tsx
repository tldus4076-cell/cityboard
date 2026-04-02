"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const providerLabels: Record<string, string> = {
  google: "Google",
  kakao: "카카오",
  naver: "네이버",
  github: "GitHub",
  credentials: "일반",
};

function UserStatusBadge({ isBlocked, suspendedUntil }: { isBlocked: boolean; suspendedUntil: string | null }) {
  if (!isBlocked) {
    return <Badge variant="free">정상</Badge>;
  }

  if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
    const daysLeft = Math.ceil((new Date(suspendedUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return (
      <Badge variant="destructive">
        정지 중 ({daysLeft}일 남음)
      </Badge>
    );
  }

  return <Badge variant="destructive">차단됨</Badge>;
}

function AdminUsersContent() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "all");

  const limit = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      status,
    });

    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAction(userId: string, action: "block" | "unblock", duration?: number) {
    const body: any = { userId, action };
    if (action === "block" && duration) {
      body.duration = duration.toString();
    }

    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || "오류가 발생했습니다");
    }
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
            <span className="text-white">회원 관리</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">👥 회원 목록</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="이메일 또는 닉네임 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm w-48"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
          >
            <option value="all">전체 상태</option>
            <option value="normal">정상</option>
            <option value="suspended">정지 중</option>
            <option value="blocked">차단됨</option>
          </select>
        </div>

        {/* Table */}
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
                <th className="px-4 py-3 font-medium">상세</th>
                <th className="px-4 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                    로딩 중...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                    회원이 없습니다
                  </td>
                </tr>
              ) : (
                users.map((user) => (
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
                        <span className="text-white/40">{providerLabels[user.loginProvider] || "회원"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      글 {user._count.posts} · 댓글 {user._count.comments}
                    </td>
                    <td className="px-4 py-3 text-white/40">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <UserStatusBadge isBlocked={user.isBlocked} suspendedUntil={user.suspendedUntil} />
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      <div>신고 {user.reportCount}회</div>
                      <div>정지 {user.suspensionCount}회</div>
                      <div>차단 {user.blockedCount}명</div>
                      {user.lastLoginAt && <div>최종 {formatDate(user.lastLoginAt)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {user.role !== "ADMIN" && (
                        <div className="flex flex-col gap-1">
                          {user.isBlocked ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 text-xs"
                              onClick={() => handleAction(user.id, "unblock")}
                            >
                              🚪 해제
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              {[7, 30, 90].map((days) => (
                                <Button
                                  key={days}
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-400 hover:text-red-300 text-xs px-1 py-0.5"
                                  onClick={() => handleAction(user.id, "block", days)}
                                >
                                  {days}일
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
}

function LoadingFallback() {
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
        <p className="text-white/40">로딩 중...</p>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdminUsersContent />
    </Suspense>
  );
}