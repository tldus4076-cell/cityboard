# P2: 인증 기능 - 상세 작업 목록

## 📋 개요

| 항목 | 내용 |
|------|------|
| Phase | P2 |
| 이름 | 인증 기능 |
| 목표 | NextAuth.js를 활용한 로그인/회원가입 시스템 |
| 예상 시간 | 2주 |
| 선행 조건 | P1 (프로젝트 세팅) 완료 |

---

## P2 주요 작업 요약

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | NextAuth.js 설치 | `next-auth` 패키지 설치 |
| 2 | NextAuth 설정 파일 | `src/lib/auth.ts` |
| 3 | Credentials Provider | 이메일/비밀번호 로그인 |
| 4 | 소셜 로그인 | Google, Kakao, Naver, GitHub |
| 5 | 세션 관리 | JWT 설정, callbacks |
| 6 | 회원가입 API | `POST /api/auth/register` |
| 7 | 로그인/회원가입 UI | 페이지 생성 |
| 8 | 마이페이지 기본 | 프로필 보기, 로그아웃 |

---

## 1. NextAuth.js 설치

```bash
npm install next-auth
```

---

## 2. NextAuth 설정 파일 생성

`src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // ==========================================
    // Credentials Provider (이메일/비밀번호)
    // ==========================================
    CredentialsProvider({
      name: "email",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("이메일과 비밀번호를 입력해 주세요.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("존재하지 않는 이메일입니다.");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("비밀번호가 올바르지 않습니다.");
        }

        if (user.isBlocked) {
          throw new Error("차단된 사용자입니다.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.nickname,
          image: user.profileImage,
          role: user.role,
        };
      },
    }),

    // ==========================================
    // Google OAuth
    // ==========================================
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ==========================================
    // Kakao OAuth
    // ==========================================
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),

    // ==========================================
    // Naver OAuth
    // ==========================================
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),

    // ==========================================
    // GitHub OAuth
    // ==========================================
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  // ==========================================
  // 세션 설정
  // ==========================================
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7일
  },

  // ==========================================
  // 콜백 함수
  // ==========================================
  callbacks: {
    async jwt({ token, user }) {
      // 처음 로그인할 때 user 정보 추가
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      // 세션에 user 정보 추가
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  // ==========================================
  // 페이지 설정
  // ==========================================
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
};
```

---

## 3. API Route 생성

`src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

---

## 4. TypeScript 타입 확장

`src/types/next-auth.d.ts`:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
```

---

## 5. 회원가입 API

`src/app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation 스키마
const registerSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
      "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다."
    ),
  nickname: z
    .string()
    .min(2, "닉네임은 2자 이상이어야 합니다.")
    .max(20, "닉네임은 20자 이하여야 합니다.")
    .regex(/^[a-zA-Z0-9가-힣]+$/, "닉네임은 특수문자를 포함할 수 없습니다."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validation
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, nickname } = result.data;

    // 이메일 중복 체크
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다." },
        { status: 400 }
      );
    }

    // 닉네임 중복 체크
    const existingNickname = await prisma.user.findUnique({
      where: { nickname },
    });
    if (existingNickname) {
      return NextResponse.json(
        { error: "이미 사용 중인 닉네임입니다." },
        { status: 400 }
      );
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 12);

    //ユーザー作成
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
      },
    });

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

---

## 6. 로그인 페이지 UI

`src/app/(auth)/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    signIn(provider, { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center"
         style={{ backgroundImage: "url('/images/city-night.jpg')" }}>
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="relative z-10 w-full max-w-md p-8 bg-white/90 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6">로그인</h1>

        {/* 이메일/비밀번호 로그인 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* 소셜 로그인 */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => handleSocialLogin("google")}
              className="w-full py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <GoogleIcon />
              Google 로그인
            </button>

            <button
              onClick={() => handleSocialLogin("kakao")}
              className="w-full py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 flex items-center justify-center gap-2"
            >
              <KakaoIcon />
              카카오 로그인
            </button>

            <button
              onClick={() => handleSocialLogin("naver")}
              className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
            >
              <NaverIcon />
              네이버 로그인
            </button>

            <button
              onClick={() => handleSocialLogin("github")}
              className="w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center justify-center gap-2"
            >
              <GithubIcon />
              GitHub 로그인
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          아직 계정이 없으신가요?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## 7. 회원가입 페이지 UI

`src/app/(auth)/register/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, 
      "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다."),
  confirmPassword: z.string(),
  nickname: z
    .string()
    .min(2, "닉네임은 2자 이상이어야 합니다.")
    .max(20, "닉네임은 20자 이하여야 합니다."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error);
        return;
      }

      alert("회원가입이 완료되었습니다. 로그인해 주세요.");
      router.push("/login");
    } catch (err) {
      setError("회원가입에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center"
         style={{ backgroundImage: "url('/images/city-night.jpg')" }}>
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="relative z-10 w-full max-w-md p-8 bg-white/90 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6">회원가입</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              type="email"
              {...register("email")}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              type="password"
              {...register("password")}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">비밀번호 확인</label>
            <input
              type="password"
              {...register("confirmPassword")}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">닉네임</label>
            <input
              type="text"
              {...register("nickname")}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.nickname && (
              <p className="text-red-500 text-sm mt-1">{errors.nickname.message}</p>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "회원가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## 8. Session Provider 설정

`src/app/providers.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

`src/app/layout.tsx`에 추가:

```typescript
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 9. 로그아웃 기능

`src/components/layout/Header.tsx`:

```typescript
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          CityBoard
        </Link>

        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <span className="text-sm">{session.user?.name}님</span>
              <Link href="/mypage" className="text-sm hover:text-blue-600">
                마이페이지
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm text-red-600 hover:text-red-700"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm hover:text-blue-600">
                로그인
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
```

---

## ✅ P2 완료 체크리스트

| # | 작업 | 상태 |
|---|------|------|
| 1 | `npm install next-auth` | ☐ |
| 2 | `npm install bcryptjs` (비밀번호 해시) | ☐ |
| 3 | `npm install @auth/prisma-adapter` | ☐ |
| 4 | `src/lib/auth.ts` 설정 파일 | ☐ |
| 5 | `src/app/api/auth/[...nextauth]/route.ts` | ☐ |
| 6 | TypeScript 타입 확장 | ☐ |
| 7 | `POST /api/auth/register` API | ☐ |
| 8 | 로그인 페이지 UI | ☐ |
| 9 | 회원가입 페이지 UI | ☐ |
| 10 | SessionProvider 설정 | ☐ |
| 11 | Header에 로그인/로그아웃 | ☐ |

---

## ⚠️ OAuth Provider 사전 준비

P2를 시작하기 전에 각 OAuth Provider에서 앱을 등록하고 Client ID/Secret을 발급받아야 합니다:

| Provider | 등록 URL | 필요 정보 |
|----------|----------|-----------|
| Google | https://console.cloud.google.com | OAuth 2.0 클라이언트 ID |
| Kakao | https://developers.kakao.com | 앱 키 (REST API 키) |
| Naver | https://developers.naver.com | OAuth 클라이언트 ID/Secret |
| GitHub | https://github.com/settings/developers | OAuth Apps 등록 |

**주의**: OAuth 앱 등록 시 **Redirect URI**를 `http://localhost:3000/api/auth/callback/{provider}`로 설정하세요.

---

## 🚀 다음 단계: P3 게시판 기본 기능

P2 완료 후 **P3: 게시판 기본 기능**으로 진행합니다.

**P3 주요 작업:**

1. 게시판 목록 UI (4개 게시판)
2. 글쓰기 API 및 UI
3. 글 상세 보기
4. 글 수정/삭제
5. 파일 업로드 API
6. 권한 체크 미들웨어

---

궁금한 점이 있으시면 언제든지 질문해 주세요!
