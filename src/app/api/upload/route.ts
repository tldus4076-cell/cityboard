import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/hwp",
  "application/vnd.ms-excel",
  "application/zip",
];

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts[parts.length - 1].toLowerCase();
}

function generateFilename(originalName: string): string {
  const ext = getExtension(originalName);
  const uuid = Math.random().toString(36).substring(2, 15);
  return `${uuid}.${ext}`;
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ files: [] });
    }

    // Create uploads directory
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const results: { filename: string; originalName: string; url: string; size: number; mimeType: string }[] = [];

    for (const file of files) {
      const mimeType = file.type || "application/octet-stream";
      const originalName = file.name;

      // Validate file type
      const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
      const isDoc = ALLOWED_DOC_TYPES.includes(mimeType);

      if (!isImage && !isDoc) {
        return NextResponse.json(
          { error: `허용되지 않는 파일 형식입니다: ${originalName}` },
          { status: 400 }
        );
      }

      // Validate file size
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `파일 크기가 초과됩니다: ${originalName} (최대 ${maxSize / 1024 / 1024}MB)` },
          { status: 400 }
        );
      }

      // Save file
      const filename = generateFilename(originalName);
      const filePath = path.join(uploadDir, filename);
      const buffer = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(buffer));

      results.push({
        filename,
        originalName,
        url: `/uploads/${filename}`,
        size: file.size,
        mimeType,
      });
    }

    return NextResponse.json({ files: results });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
