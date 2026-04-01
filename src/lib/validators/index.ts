import { z } from "zod";

// =============================================
// Auth Validators
// =============================================

export const registerSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/,
      "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다"
    ),
  nickname: z
    .string()
    .min(2, "닉네임은 2자 이상이어야 합니다")
    .max(20, "닉네임은 20자 이하여야 합니다")
    .regex(/^[a-zA-Z0-9가-힣]+$/, "닉네임은 한글, 영문, 숫자만 가능합니다"),
});

export const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// =============================================
// Post Validators
// =============================================

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, "제목을 입력해주세요")
    .max(100, "제목은 100자 이하여야 합니다"),
  content: z
    .string()
    .min(1, "내용을 입력해주세요")
    .max(10000, "내용은 10,000자 이하여야 합니다"),
  boardType: z.enum(["FREE", "NOTICE", "QNA", "RESOURCE"]),
  postType: z.enum(["NORMAL", "NOTICE", "SECRET", "ANONYMOUS"]).default("NORMAL"),
});

export const updatePostSchema = z.object({
  title: z
    .string()
    .min(1, "제목을 입력해주세요")
    .max(100, "제목은 100자 이하여야 합니다")
    .optional(),
  content: z
    .string()
    .min(1, "내용을 입력해주세요")
    .max(10000, "내용은 10,000자 이하여야 합니다")
    .optional(),
  postType: z.enum(["NORMAL", "NOTICE", "SECRET", "ANONYMOUS"]).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

// =============================================
// Comment Validators
// =============================================

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "댓글 내용을 입력해주세요")
    .max(1000, "댓글은 1,000자 이하여야 합니다"),
  postId: z.string().cuid("유효한 게시글 ID입니다"),
  parentId: z.string().cuid().optional(), // 대댓글용
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "댓글 내용을 입력해주세요")
    .max(1000, "댓글은 1,000자 이하여야 합니다"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

// =============================================
// Report Validators
// =============================================

export const createReportSchema = z.object({
  postId: z.string().cuid("유효한 게시글 ID입니다").optional(),
  commentId: z.string().cuid("유효한 댓글 ID입니다").optional(),
  reason: z.enum([
    "ABUSE",
    "SPAM",
    "INAPPROPRIATE",
    "PERSONAL_INFO",
    "OTHER",
  ]),
  memo: z.string().max(500, "메모는 500자 이하여야 합니다").optional(),
}).refine((data) => data.postId || data.commentId, {
  message: "신고 대상(게시글 또는 댓글)을 선택해주세요",
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

// =============================================
// Search Validators
// =============================================

export const searchSchema = z.object({
  q: z.string().min(1, "검색어를 입력해주세요").max(100),
  board: z.enum(["FREE", "NOTICE", "QNA", "RESOURCE"]).optional(),
  period: z.enum(["today", "week", "month", "year", "all"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type SearchInput = z.infer<typeof searchSchema>;
