import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);

  const parsed = searchSchema.safeParse({
    q: searchParams.get("q"),
    board: searchParams.get("board"),
    period: searchParams.get("period"),
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { q, board, period, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  // Period filter
  let dateFrom: Date | undefined;
  if (period && period !== "all") {
    const now = new Date();
    switch (period) {
      case "today":
        dateFrom = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        dateFrom = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        dateFrom = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        dateFrom = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }
  }

  const where: any = {
    deletedAt: null,
    // Hidden posts only visible to admin or author
    OR: [
      { isHidden: false },
      session?.user?.role === "ADMIN" ? {} : { authorId: session?.user?.id },
    ],
    // Secret posts visibility
    AND: [
      {
        OR: [
          { postType: { not: "SECRET" } },
          session?.user?.role === "ADMIN" ? {} : { authorId: session?.user?.id },
        ],
      },
    ],
  };

  // Text search
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }

  // Board filter
  if (board) {
    where.boardType = board;
  }

  // Date filter
  if (dateFrom) {
    where.createdAt = { gte: dateFrom };
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, nickname: true, profileImage: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit });
}
