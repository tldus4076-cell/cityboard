import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findIdSchema } from "@/lib/validators";

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) return email;

  if (localPart.length <= 2) {
    return `${localPart[0] ?? ""}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = findIdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { nickname: parsed.data.nickname },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "해당 닉네임으로 가입된 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: user.email,
      maskedEmail: maskEmail(user.email),
    });
  } catch (error) {
    console.error("Find ID error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
