# P1: 프로젝트 세팅 - 상세 작업 목록

## 📋 개요

| 항목 | 내용 |
|------|------|
| Phase | P1 |
| 이름 | 프로젝트 세팅 |
| 목표 | Next.js + PostgreSQL + Prisma 개발 환경 구축 |
| 예상 시간 | 1주 |

---

## 1. Next.js 프로젝트 생성

### 1-1) 프로젝트 생성

```bash
npx create-next-app@latest cityboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**선택 옵션:**

| 옵션 | 선택 |
|------|------|
| TypeScript | Yes |
| Tailwind CSS | Yes |
| ESLint | Yes |
| App Router | Yes |
| src/ directory | Yes |
| import alias | @/* |

### 1-2) 프로젝트 디렉토리 이동

```bash
cd cityboard
```

### 1-3) 기본 실행 확인

```bash
npm run dev
```

- 브라우저에서 `http://localhost:3000` 접속 확인

---

## 2. Prisma 설치 및 설정

### 2-1) Prisma 설치

```bash
npm install prisma @prisma/client
```

### 2-2) Prisma 초기화

```bash
npx prisma init
```

**생성되는 파일:**

- `prisma/schema.prisma`
- `.env` (빈 파일)

---

## 3. Neon PostgreSQL 연결

### 3-1) Neon 계정 생성

1. https://neon.tech 접속
2. GitHub 로그인
3. New Project 생성
4. Connection string 복사

### 3-2) .env 파일 설정

```env
DATABASE_URL="postgresql://username:password@ep-xxx-xxx-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 3-3) DB 연결 확인

```bash
npx prisma db push
```

**성공 시 출력:**

```
✓ Generated Prisma client.
Your database is now in sync with your schema.
```

---

## 4. Prisma 스키마 설계

### 4-1) schema.prisma 작성

`prisma/schema.prisma` 파일을 아래와 같이 작성:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User 모델
// ============================================
enum UserRole {
  USER
  ADMIN
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?   // 소셜 로그인 시 null
  nickname      String    @unique
  profileImage  String?
  role          UserRole  @default(USER)
  isBlocked     Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 관계
  posts         Post[]
  comments      Comment[]
  likes         Like[]
  reports       Report[]       @relation("Reporter")
  bookmarks     Bookmark[]
  files        File[]

  @@map("users")
}

// ============================================
// Post 모델
// ============================================
enum BoardType {
  FREE      // 자유게시판
  NOTICE    // 공지사항
  QNA       // 질문게시판
  RESOURCE  // 자료실
}

enum PostType {
  NORMAL    // 일반글
  NOTICE     // 공지글
  SECRET     // 비밀글
  ANONYMOUS  // 익명글
}

model Post {
  id          String    @id @default(cuid())
  title       String
  content     String
  boardType   BoardType
  postType    PostType  @default(NORMAL)
  viewCount   Int       @default(0)
  isHidden    Boolean   @default(false)  // 신고 누적 숨김
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 관계
  authorId    String?
  author      User?     @relation(fields: [authorId], references: [id], onDelete: SetNull)
  comments    Comment[]
  likes       Like[]
  reports     Report[]
  bookmarks   Bookmark[]
  files       File[]

  @@index([boardType])
  @@index([authorId])
  @@index([createdAt])
  @@map("posts")
}

// ============================================
// Comment 모델
// ============================================
model Comment {
  id        String    @id @default(cuid())
  content   String
  isHidden  Boolean   @default(false)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // 관계
  authorId   String?
  author     User?    @relation(fields: [authorId], references: [id], onDelete: SetNull)
  postId     String
  post       Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  parentId   String?
  parent     Comment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies    Comment[] @relation("CommentReplies")
  likes      Like[]
  reports    Report[]

  @@index([postId])
  @@index([authorId])
  @@index([parentId])
  @@map("comments")
}

// ============================================
// Like 모델
// ============================================
model Like {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now())

  // 관계
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  postId     String?
  post       Post?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  commentId  String?
  comment    Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])   // 같은 글 중복 좋아요 불가
  @@unique([userId, commentId]) // 같은 댓글 중복 좋아요 불가
  @@map("likes")
}

// ============================================
// Report 모델
// ============================================
enum ReportReason {
  HATE_SPEECH    // 욕설/비방
  SPAM           // 스팸/광고
  INAPPROPRIATE  // 불건전한 내용
  PRIVACY        // 개인정보 노출
  OTHER          // 기타
}

enum ReportStatus {
  PENDING   // 대기중
  RESOLVED  // 처리됨
  REJECTED  // 기각
}

model Report {
  id        String       @id @default(cuid())
  reason    ReportReason
  status    ReportStatus @default(PENDING)
  createdAt DateTime     @default(now())

  // 관계
  reporterId  String
  reporter    User      @relation("Reporter", fields: [reporterId], references: [id], onDelete: Cascade)
  postId      String?
  post        Post?     @relation(fields: [postId], references: [id], onDelete: Cascade)
  commentId   String?
  comment     Comment?  @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@index([postId])
  @@index([commentId])
  @@index([status])
  @@map("reports")
}

// ============================================
// Bookmark 모델
// ============================================
model Bookmark {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  // 관계
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
  @@map("bookmarks")
}

// ============================================
// File 모델
// ============================================
model File {
  id           String   @id @default(cuid())
  filename     String   // 저장된 파일명 (UUID)
  originalName String   // 원본 파일명
  mimeType     String
  size         Int      // 바이트 단위
  url          String   // 파일 URL
  createdAt    DateTime @default(now())

  // 관계
  uploaderId   String?
  uploader     User?    @relation(fields: [uploaderId], references: [id], onDelete: SetNull)
  postId       String?
  post         Post?    @relation(fields: [postId], references: [id], onDelete: SetNull)

  @@index([postId])
  @@index([uploaderId])
  @@map("files")
}
```

### 4-2) Prisma Client 생성

```bash
npx prisma generate
```

### 4-3) DB 스키마 동기화

```bash
npx prisma db push
```

---

## 5. 폴더 구조 설계

### 5-1) 디렉토리 생성

```bash
mkdir -p app/(auth)/login
mkdir -p app/(auth)/register
mkdir -p app/(main)/board/\[type\]
mkdir -p app/(main)/post/\[id\]
mkdir -p app/(main)/write
mkdir -p app/(main)/search
mkdir -p app/(main)/mypage
mkdir -p app/admin/dashboard
mkdir -p app/admin/users
mkdir -p app/admin/reports
mkdir -p app/api/auth/\[...nextauth\]
mkdir -p app/api/posts/\[id\]
mkdir -p app/api/comments/\[id\]
mkdir -p app/api/likes
mkdir -p app/api/reports
mkdir -p app/api/bookmarks
mkdir -p app/api/search
mkdir -p app/api/admin/dashboard
mkdir -p app/api/admin/users/\[id\]
mkdir -p app/api/admin/reports/\[id\]
mkdir -p app/api/admin/posts/\[id\]/author
mkdir -p app/api/upload
mkdir -p app/api/files/\[id\]
mkdir -p components/ui
mkdir -p components/layout
mkdir -p components/posts
mkdir -p components/comments
mkdir -p components/forms
mkdir -p lib
mkdir -p lib/validators
mkdir -p public/images
mkdir -p public/uploads
```

### 5-2) TypeScript 경로 설정 확인

`tsconfig.json`에 다음이 포함되어 있는지 확인:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 6. 환경 변수 설정

### 6-1) .env.example 파일 생성

```env
# ============================================
# Database
# ============================================
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# ============================================
# NextAuth
# ============================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this"

# ============================================
# OAuth Providers
# ============================================
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

KAKAO_CLIENT_ID=""
KAKAO_CLIENT_SECRET=""

NAVER_CLIENT_ID=""
NAVER_CLIENT_SECRET=""

GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# ============================================
# Storage (Supabase or AWS S3)
# ============================================
STORAGE_BUCKET=""
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_ENDPOINT=""
STORAGE_URL=""
```

### 6-2) .env 파일 생성 (개발용)

```bash
cp .env.example .env
```

**주의**: `.env` 파일은 절대 Git에 커밋하지 마세요!

### 6-3) .gitignore 확인

```gitignore
# Environment
.env
.env.local
.env.*.local
```

---

## 7. Tailwind CSS & 기본 UI 설정

### 7-1) Tailwind 설정 확인

`tailwind.config.ts` 확인:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 필요시 커스텀 색상 추가
      },
      fontFamily: {
        // 필요시 커스텀 폰트 추가
      },
    },
  },
  plugins: [],
};

export default config;
```

### 7-2) 기본 레이아웃 설정

`src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    direction: ltr;
  }
  body {
    @apply bg-gray-50 text-gray-900;
  }
}
```

### 7-3) 기본 폰트 설정 (선택)

Google Fonts 중 Pretendard 또는 Inter 추가:

```bash
npm install @next/font/google
```

`src/app/layout.tsx`:

```typescript
import { Inter, Noto_Sans_KR } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "700"] });

export const metadata = {
  title: "CityBoard",
  description: "감성적인 해외 도시 야경 커뮤니티 게시판",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={notoSansKr.className}>{children}</body>
    </html>
  );
}
```

---

## 8. Prisma Client 유틸리티

### 8-1) Prisma 클라이언트 생성

`src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 8-2) 사용법

```typescript
import { prisma } from "@/lib/prisma";

// 예시
const users = await prisma.user.findMany();
const post = await prisma.post.create({
  data: {
    title: "Hello",
    content: "World",
    boardType: "FREE",
  },
});
```

---

## 9. Git 초기화

### 9-1) Git 레포지토리 초기화

```bash
git init
```

### 9-2) .gitignore 파일 확인

```gitignore
# Dependencies
node_modules/
.pnp/
.pnp.js

# Build
.next/
out/
dist/
build/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Testing
coverage/

# Misc
.ignore
*.log
```

### 9-3) 초기 커밋

```bash
git add .
git commit -m "feat: initial project setup - Next.js + Prisma + PostgreSQL"
```

---

## ✅ P1 완료 체크리스트

| # | 작업 | 상태 |
|---|------|------|
| 1 | Next.js 프로젝트 생성 (`create-next-app`) | ☐ |
| 2 | `npm run dev`로 개발 서버 실행 확인 | ☐ |
| 3 | Prisma 설치 (`prisma`, `@prisma/client`) | ☐ |
| 4 | Neon PostgreSQL 연결 string 설정 | ☐ |
| 5 | `npx prisma db push` 성공 | ☐ |
| 6 | Prisma 스키마 작성 (7개 모델) | ☐ |
| 7 | `npx prisma generate` 성공 | ☐ |
| 8 | 폴더 구조 생성 | ☐ |
| 9 | `.env.example` 파일 생성 | ☐ |
| 10 | Tailwind CSS 설정 확인 | ☐ |
| 11 | `src/lib/prisma.ts` 생성 | ☐ |
| 12 | Git 초기화 및 첫 커밋 | ☐ |

---

## 🚀 다음 단계: P2 인증 기능

P1이 완료되면 자동으로 **P2: 인증 기능**으로 이동합니다.

**P2 주요 작업:**

1. NextAuth.js 설정
2. Credentials Provider (이메일/비밀번호)
3. 소셜 로그인 (Google, Kakao, Naver, GitHub)
4. 세션 관리
5. 로그인/회원가입 UI

---

## ⚠️ 주의사항

1. **Neon PostgreSQL**: 아직 계정이 없다면 https://neon.tech 에서 생성
2. **OAuth Credentials**: 나중에 P2에서 필요하므로 미리 준비해도 됨
   - Google Cloud Console
   - Kakao Developers
   - Naver Developers
   - GitHub OAuth Apps

---

궁금한 점이 있으시면 언제든지 질문해 주세요!
