# 기술 스택

## 1. 기술 스택 개요

| 구분 | 기술 | 설명 |
|------|------|------|
| **프론트엔드** | Next.js (App Router) | React 기반 풀스택 프레임워크 |
| **백엔드** | Next.js API Route / Route Handler | 프론트엔드와 통합 |
| **데이터베이스** | PostgreSQL | 관계형 데이터베이스 |
| **ORM** | Prisma | 타입 안전한 DB 액세스 |
| **인증** | NextAuth.js (Auth.js) | 다양한 로그인 제공 |
| **스타일링** | Tailwind CSS | 유틸리티 우선 CSS |
| **파일 저장** | Supabase Storage 또는 AWS S3 | 클라우드 오브젝트 스토리지 |
| **호스팅** | Vercel (프론트) + Neon/Supabase (DB) | 서버리스 배포 |

---

## 2. 프론트엔드

### 2.1 Next.js (App Router)

**선택 이유:**

- 프론트엔드와 백엔드를 하나의 프로젝트에서 관리
- SSR/SSG 지원으로 SEO 최적화
- API Route로 손쉬운 백엔드 개발
- 대규모 커뮤니티에 적합한 확장성

**사용 패턴:**

- Server Components (기본)
- Client Components (인터랙션 필요 시)
- Server Actions (폼 제출, 데이터 변경)

### 2.2 Tailwind CSS

**선택 이유:**

- 빠른 UI 개발
- 일관된 디자인 시스템 구축 용이
- 작은 번들 사이즈 (PurgeCSS)
- 반응형 디자인 손쉬운 구현

---

## 3. 백엔드

### 3.1 API Route / Route Handler

- Next.js 내장 API 기능 활용
- RESTful API 설계

### 3.2 주요 API 구조

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/auth/*` | GET/POST | 인증 관련 |
| `/api/posts` | GET/POST | 게시글 목록/생성 |
| `/api/posts/[id]` | GET/PUT/DELETE | 게시글 단일 조회/수정/삭제 |
| `/api/comments` | GET/POST | 댓글 목록/생성 |
| `/api/comments/[id]` | DELETE | 댓글 삭제 |
| `/api/likes` | POST/DELETE | 좋아요 추가/취소 |
| `/api/reports` | POST | 신고하기 |
| `/api/bookmarks` | GET/POST/DELETE | 북마크 |
| `/api/admin/*` | GET/POST/PUT/DELETE | 관리자 기능 |
| `/api/search` | GET | 검색 |

---

## 4. 데이터베이스

### 4.1 PostgreSQL

**선택 이유:**

- 관계형 데이터 처리 안정성
- 복잡한 검색 쿼리 지원
- JSON 데이터 타입 지원
- 커뮤니티 网站에 적합한 확장성

### 4.2 Prisma ORM

**선택 이유:**

- 타입 안전한 DB 액세스
- 직관적인 스키마 정의
- 마이그레이션 관리 용이
- IDE 자동완성 지원

### 4.3 주요 데이터 모델

```
User
├── id
├── email (unique)
├── password (hashed)
├── nickname (unique)
├── profileImage
├── role (USER / ADMIN)
├── createdAt
└── updatedAt

Post
├── id
├── title
├── content
├── boardType (FREE / NOTICE / QNA / RESOURCE)
├── postType (NORMAL / NOTICE / SECRET / ANONYMOUS)
├── authorId (FK User)
├── isHidden (신고 누적)
├── createdAt
└── updatedAt

Comment
├── id
├── content
├── authorId (FK User)
├── postId (FK Post)
├── parentId (FK Comment, 대댓글용)
├── createdAt
└── updatedAt

Like
├── id
├── userId (FK User)
├── postId (FK Post, nullable)
├── commentId (FK Comment, nullable)
├── createdAt

Report
├── id
├── reporterId (FK User)
├── postId (FK Post, nullable)
├── commentId (FK Comment, nullable)
├── reason
├── status (PENDING / RESOLVED / REJECTED)
├── createdAt

Bookmark
├── id
├── userId (FK User)
├── postId (FK Post)
├── createdAt

File
├── id
├── filename
├── originalName
├── mimeType
├── size
├── url
├── uploaderId (FK User)
├── postId (FK Post, nullable)
├── createdAt
```

---

## 5. 인증

### 5.1 NextAuth.js (Auth.js)

**지원 Provider:**

| Provider | 설명 |
|----------|------|
| Credentials | 이메일 + 비밀번호 |
| Google | OAuth |
| Kakao | OAuth |
| Naver | OAuth |
| GitHub | OAuth |

**세션 전략:**

- JWT 기반 세션
- 세션 만료: 7일 (rolling)

---

## 6. 파일 업로드

### 6.1 Supabase Storage 또는 AWS S3

**선택 이유:**

- 서버에 직접 파일 저장 불필요
- CDN 연동으로 빠른 전송
- 용량 확장 용이

**저장 구조:**

```
/uploads
  /images/{uuid}.{ext}
  /documents/{uuid}.{ext}
```

### 6.2 파일 크기 제한

| 종류 | 제한 |
|------|------|
| 이미지 | 5MB |
| 문서 | 10MB |

---

## 7. UI/UX 라이브러리

| 용도 | 라이브러리 | 설명 |
|------|------------|------|
| 아이콘 | Lucide React |轻盈한 아이콘 |
| 폼 validation | Zod + React Hook Form | 타입 안전한 검증 |
| UI 컴포넌트 | shadcn/ui | 재사용 가능한 컴포넌트 |
| 날짜 포맷 | date-fns | 날짜 처리 |
| 에디터 | Tiptap 또는 Simple MDE | markdown 기반 |

---

## 8. 개발 도구

| 용도 | 도구 |
|------|------|
| 패키지 관리 | npm / yarn / pnpm |
| 형식 검사 | ESLint |
| 코드 포맷 | Prettier |
| Git Hooks | Husky + lint-staged |
| 환경 변수 | dotenv |

---

## 9. 배포

### 9.1 Vercel

- Next.js 공식 지원
- GitHub 연동 자동 배포
- Preview 배포 지원

### 9.2 Neon (PostgreSQL)

- 서버리스 PostgreSQL
- Vercel과 좋은 궁합
- Branch 기반 DB 지원

### 9.3 Supabase

- PostgreSQL + 추가 기능 (Auth, Storage 등)
- Free tier 충분

---

## 10. 프로젝트 구조

```
my-board/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (main)/
│   │   ├── page.tsx (홈)
│   │   ├── board/[type]/ (게시판 목록)
│   │   ├── post/[id]/ (게시글 상세)
│   │   ├── write/ (글쓰기)
│   │   ├── search/ (검색)
│   │   ├── mypage/ (마이페이지)
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── reports/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── posts/
│   │   ├── comments/
│   │   ├── likes/
│   │   ├── reports/
│   │   ├── bookmarks/
│   │   ├── search/
│   │   └── admin/
│   ├── globals.css
│   ├── layout.tsx
│   └── providers.tsx
├── components/
│   ├── ui/ (shadcn/ui)
│   ├── layout/
│   ├── posts/
│   ├── comments/
│   └── forms/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── validators/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── uploads/ (개발용)
├── .env
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 11. 환경 변수 (.env)

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
KAKAO_CLIENT_ID=""
KAKAO_CLIENT_SECRET=""
NAVER_CLIENT_ID=""
NAVER_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Storage
STORAGE_BUCKET=""
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_ENDPOINT=""
```

---

## 12. 기술 스택 결정 이유 요약

| 기술 | 선택한 이유 |
|------|-------------|
| Next.js | 풀스택 통합으로 개발 효율성, SSR/SSG 지원 |
| PostgreSQL | 안정적인 관계형 DB, 검색에 강함 |
| Prisma | 타입 안전, 개발 속도 향상 |
| NextAuth | 다양한 OAuth 통합, 확장성 |
| Tailwind CSS | 빠른 UI 개발, 일관된 디자인 |
| Supabase/S3 | 간편한 파일 관리 |
| Vercel + Neon | 서버리스로 개인 프로젝트에 경제적 |
