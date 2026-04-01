import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen city-bg">
      <div className="min-h-screen bg-black/40">
        {/* Header */}
        <header className="border-b border-white/10 bg-black/30 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌃</span>
              <h1 className="text-xl font-bold neon-text text-blue-300">
                CityBoard
              </h1>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-white/80 hover:text-white transition"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md transition"
              >
                회원가입
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 neon-text">
            당신의 이야기를 들려주세요
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
            자유게시판, 공지사항, 질문게시판, 자료실을 통해\n나눔과 소통의 공간을
            만들어갑니다
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/board/FREE"
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-medium transition"
            >
              자유게시판 →
            </Link>
            <Link
              href="/board/QNA"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-medium transition border border-white/20"
            >
              질문게시판 →
            </Link>
          </div>
        </section>

        {/* Board Cards */}
        <section className="max-w-6xl mx-auto px-4 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: "💬",
                name: "자유게시판",
                desc: "자유로운 소통과 정보 공유",
                href: "/board/FREE",
                color: "from-blue-500 to-blue-700",
              },
              {
                icon: "📢",
                name: "공지사항",
                desc: "중요한 안내 사항",
                href: "/board/NOTICE",
                color: "from-red-500 to-red-700",
              },
              {
                icon: "❓",
                name: "질문게시판",
                desc: "궁금한 것을 질문하고 답변하기",
                href: "/board/QNA",
                color: "from-green-500 to-green-700",
              },
              {
                icon: "📚",
                name: "자료실",
                desc: "유용한 자료를 공유합니다",
                href: "/board/RESOURCE",
                color: "from-purple-500 to-purple-700",
              },
            ].map((board) => (
              <Link
                key={board.href}
                href={board.href}
                className={`bg-gradient-to-br ${board.color} p-6 rounded-xl card-glow hover:scale-105 transition-transform cursor-pointer`}
              >
                <span className="text-4xl mb-3 block">{board.icon}</span>
                <h3 className="text-lg font-bold text-white mb-1">
                  {board.name}
                </h3>
                <p className="text-sm text-white/70">{board.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
