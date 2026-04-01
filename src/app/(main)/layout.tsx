import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen city-bg">
      {/* Main Header */}
      <header className="bg-black/60 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🌃</span>
              <span className="font-bold neon-text text-blue-300">CityBoard</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { href: "/board/FREE", label: "자유" },
                { href: "/board/NOTICE", label: "공지" },
                { href: "/board/QNA", label: "질문" },
                { href: "/board/RESOURCE", label: "자료실" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/60 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition text-sm"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/search">
              <button className="text-white/60 hover:text-white transition p-2 rounded-md hover:bg-white/10">
                🔍
              </button>
            </Link>
            {session?.user ? (
              <>
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/admin/dashboard"
                    className="text-yellow-400 hover:text-yellow-300 text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition"
                  >
                    관리자
                  </Link>
                )}
                <Link href="/mypage">
                  <button className="text-white/70 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition">
                    {session.user.name}
                  </button>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-white/60 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition"
                >
                  로그인
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded-md transition"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-black/40 border-t border-white/5 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-white/30 text-sm">
          <p>© 2026 CityBoard.海外 도시 야경 테마 커뮤니티 게시판</p>
        </div>
      </footer>
    </div>
  );
}
