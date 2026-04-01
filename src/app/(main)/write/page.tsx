import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const session = await auth();
  const { board: boardType } = await searchParams;

  if (!session?.user) {
    redirect("/login");
  }

  const boards = [
    { type: "FREE", name: "자유게시판" },
    { type: "QNA", name: "질문게시판" },
    { type: "NOTICE", name: "공지사항", adminOnly: true },
    { type: "RESOURCE", name: "자료실", adminOnly: true },
  ];

  // Filter out admin-only boards for non-admins
  const availableBoards = boards.filter((b) => {
    if (b.adminOnly && session.user.role !== "ADMIN") return false;
    return true;
  });

  return (
    <div className="min-h-screen city-bg">
      <div className="bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Link href="/">🌃</Link>
            <span>›</span>
            <span>글쓰기</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">새 글 작성</h1>

        <form action="/api/posts" method="POST" className="space-y-6">
          <div>
            <label className="block text-white/80 text-sm mb-2">게시판</label>
            <select
              name="boardType"
              defaultValue={boardType || ""}
              required
              className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white"
            >
              <option value="" disabled>
                게시판을 선택하세요
              </option>
              {availableBoards.map((b) => (
                <option key={b.type} value={b.type}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white/80 text-sm mb-2">글 종류</label>
            <div className="flex gap-4">
              {[
                { value: "NORMAL", label: "일반글" },
                { value: "SECRET", label: "🔒 비밀글" },
                { value: "ANONYMOUS", label: "👤 익명글" },
              ].map((type) => (
                <label key={type.value} className="flex items-center gap-2 text-white/70 cursor-pointer">
                  <input
                    type="radio"
                    name="postType"
                    value={type.value}
                    defaultChecked={type.value === "NORMAL"}
                    className="accent-blue-500"
                  />
                  {type.label}
                </label>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-1">
              공지글은 관리자만 작성할 수 있습니다
            </p>
          </div>

          <div>
            <label className="block text-white/80 text-sm mb-2">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              maxLength={100}
              placeholder="제목을 입력해주세요"
              className="w-full bg-white/10 border border-white/20 rounded-md px-4 py-2 text-white placeholder:text-white/40"
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm mb-2">
              내용 <span className="text-red-400">*</span>
            </label>
            <textarea
              name="content"
              required
              maxLength={10000}
              rows={12}
              placeholder="내용을 입력해주세요"
              className="w-full bg-white/10 border border-white/20 rounded-md px-4 py-2 text-white placeholder:text-white/40 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md font-medium transition"
            >
              등록
            </button>
            <button
              type="button"
              onClick={() => history.back()}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-md font-medium transition border border-white/20"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
