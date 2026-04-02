import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOC_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg", "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/hwp",
  "application/vnd.ms-excel",
  "application/zip",
];

function generateFilename(ext: string): string {
  const uuid = Math.random().toString(36).substring(2, 15);
  return `${uuid}.${ext}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const boardType = searchParams.get("board");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const session = await auth();

  try {
    // Build visibility filter for SECRET posts
    const secretFilter =
      session?.user?.role === "ADMIN"
        ? {}
        : session?.user?.id
        ? { authorId: session.user.id }
        : { authorId: "__none__" }; // no access for guests

    const where: any = {
      deletedAt: null,
      boardType: boardType || undefined,
      // Hidden posts: admin/author only
      OR: [
        { isHidden: false },
        secretFilter,
      ],
    };

    // SECRET visibility: show in list but title visible
    // (title is shown, but clicking shows 403 - handled in post detail)

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, nickname: true, profileImage: true } },
          _count: { select: { comments: true, likes: true } },
        },
        orderBy: [
          { boardType: "asc" }, // NOTICE boards pinned? handled separately
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({ posts, total, page, limit });
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    let title: string;
    let content: string;
    let boardType: string;
    let postType = "NORMAL";
    let files: File[] = [];

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData (with file upload)
      const formData = await req.formData();
      title = formData.get("title") as string;
      content = formData.get("content") as string;
      boardType = formData.get("boardType") as string;

      // Post type from toggles (checkboxes)
      const secretToggle = formData.get("postType") as string;
      const allTypes = formData.getAll("postType") as string[];

      // If multiple selected (shouldn't happen normally), prefer order
      if (allTypes.includes("SECRET")) postType = "SECRET";
      else if (allTypes.includes("ANONYMOUS")) postType = "ANONYMOUS";

      // Collect files
      const fileEntries = formData.getAll("files") as File[];
      files = fileEntries.filter((f) => f && f.size > 0);
    } else {
      // Handle JSON
      const body = await req.json();
      title = body.title;
      content = body.content;
      boardType = body.boardType;
      postType = body.postType || "NORMAL";
    }

    // Validation
    if (!title?.trim() || !content?.trim() || !boardType) {
      return NextResponse.json({ error: "제목, 내용, 게시판을 입력해주세요" }, { status: 400 });
    }

    if (title.length > 100 || content.length > 10000) {
      return NextResponse.json({ error: "입력 길이를 초과했습니다" }, { status: 400 });
    }

    // Admin-only board check
    if ((boardType === "NOTICE" || boardType === "RESOURCE") && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    // Upload files
    const uploadedFiles: { filename: string; originalName: string; url: string; size: number; mimeType: string }[] = [];

    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        const isImage = file.type === "image/jpeg" || file.type === "image/png";
        const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;

        if (!ALLOWED_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: `허용되지 않는 파일 형식: ${file.name}` },
            { status: 400 }
          );
        }

        if (file.size > maxSize) {
          return NextResponse.json(
            { error: `파일 크기 초과: ${file.name} (최대 ${maxSize / 1024 / 1024}MB)` },
            { status: 400 }
          );
        }

        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const filename = generateFilename(ext);
        const filePath = path.join(uploadDir, filename);
        const buffer = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(buffer));

        uploadedFiles.push({
          filename,
          originalName: file.name,
          url: `/uploads/${filename}`,
          size: file.size,
          mimeType: file.type,
        });
      }
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        boardType,
        postType,
        authorId: session.user.id,
        anonymousAuthorId: postType === "ANONYMOUS" ? session.user.id : undefined,
        files: uploadedFiles.length > 0
          ? {
              create: uploadedFiles.map((f) => ({
                filename: f.filename,
                originalName: f.originalName,
                url: f.url,
                mimeType: f.mimeType,
                size: f.size,
                uploaderId: session.user.id,
              })),
            }
          : undefined,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
