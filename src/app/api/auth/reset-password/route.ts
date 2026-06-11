import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, nickname, newPassword } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { email, nickname },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "이메일과 닉네임이 일치하는 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "소셜 로그인 계정은 비밀번호 재설정을 사용할 수 없습니다." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "비밀번호가 새로 저장되었습니다." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
