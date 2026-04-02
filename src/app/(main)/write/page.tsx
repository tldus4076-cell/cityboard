import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const session = await auth();
  const { board: defaultBoard } = await searchParams;

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  const boards = [
    { type: "FREE", name: "💬 자유게시판", color: "bg-blue-500/20 border-blue-500/30 text-blue-300" },
    { type: "QNA", name: "❓ 질문게시판", color: "bg-green-500/20 border-green-500/30 text-green-300" },
  ];

  if (isAdmin) {
    boards.unshift({ type: "NOTICE", name: "📢 공지사항", color: "bg-red-500/20 border-red-500/30 text-red-300" });
    boards.push({ type: "RESOURCE", name: "📚 자료실", color: "bg-purple-500/20 border-purple-500/30 text-purple-300" });
  }

  const selectedBoard = defaultBoard || "FREE";

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

        {/* Board Selection Tabs */}
        <div className="mb-6">
          <p className="text-white/60 text-sm mb-3">게시판 선택</p>
          <div className="flex flex-wrap gap-3">
            {boards.map((board) => (
              <a
                key={board.type}
                href={`/write?board=${board.type}`}
                className={`px-4 py-2 rounded-lg border transition ${
                  selectedBoard === board.type
                    ? `${board.color} border-current bg-white/10`
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                }`}
              >
                {board.name}
              </a>
            ))}
          </div>
        </div>

        {/* Write Form */}
        <form action="/api/posts" method="POST" className="space-y-6" encType="multipart/form-data">
          {/* Hidden board type */}
          <input type="hidden" name="boardType" value={selectedBoard} />

          {/* Title */}
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

          {/* Content */}
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

          {/* Secret / Anonymous Toggles */}
          <div className="flex flex-wrap gap-6">
            {/* 🔒 Secret Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  name="postType"
                  value="SECRET"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer-checked:bg-yellow-500/30 transition" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition" />
              </div>
              <span className="text-white/70 group-hover:text-white transition text-sm flex items-center gap-1">
                🔒 비밀글
              </span>
            </label>

            {/* 👤 Anonymous Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  name="postType"
                  value="ANONYMOUS"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer-checked:bg-gray-500/30 transition" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition" />
              </div>
              <span className="text-white/70 group-hover:text-white transition text-sm flex items-center gap-1">
                👤 익명글
              </span>
            </label>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-white/80 text-sm mb-2">파일 첨부</label>
            <input
              type="file"
              name="files"
              multiple
              accept="image/jpeg,image/png,application/pdf,.docx,.hwp,.xlsx,.zip"
              className="block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white/70 hover:file:bg-white/20 cursor-pointer"
            />
            <p className="text-white/30 text-xs mt-1">
              이미지: jpg, png (5MB 이하) | 문서: pdf, docx, hwp, xlsx, zip (10MB 이하)
            </p>
          </div>

          {/* Notice */}
          {selectedBoard === "NOTICE" && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-300 text-sm">📢 공지사항은 관리자만 작성할 수 있습니다.</p>
            </div>
          )}

          {selectedBoard === "RESOURCE" && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <p className="text-purple-300 text-sm">📚 자료실은 관리자만 업로드할 수 있습니다.</p>
            </div>
          )}

          {/* Submit */}
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
