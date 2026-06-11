"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordInput) {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "비밀번호 재설정에 실패했습니다.");
        return;
      }

      setSuccess("비밀번호가 바뀌었습니다. 새 비밀번호로 로그인해보세요.");
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 1200);
    } catch {
      setError("비밀번호 재설정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen city-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🌃</span>
            <span className="text-2xl font-bold neon-text text-blue-300">CityBoard</span>
          </Link>
        </div>

        <Card className="border-white/10 bg-black/40 backdrop-blur-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-white">비밀번호 찾기</CardTitle>
            <CardDescription className="text-white/60">
              이메일과 닉네임을 확인한 뒤 새 비밀번호로 바꿔요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-md border border-green-500/30 bg-green-500/20 p-3 text-sm text-green-200">
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-white/80" htmlFor="email">
                  이메일
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/80" htmlFor="nickname">
                  닉네임
                </label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="가입할 때 쓴 닉네임"
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  {...register("nickname")}
                />
                {errors.nickname && <p className="text-xs text-red-400">{errors.nickname.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/80" htmlFor="newPassword">
                  새 비밀번호
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="8자 이상, 영문/숫자/특수문자"
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  {...register("newPassword")}
                />
                {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/80" htmlFor="confirmPassword">
                  새 비밀번호 확인
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="한 번 더 입력"
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={isLoading}>
                {isLoading ? "바꾸는 중..." : "새 비밀번호 저장"}
              </Button>
            </form>

            <div className="mt-6 flex justify-between text-sm text-white/60">
              <Link href="/login" className="text-blue-400 hover:underline">
                로그인으로 돌아가기
              </Link>
              <Link href="/find-id" className="text-blue-400 hover:underline">
                아이디 찾기
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
