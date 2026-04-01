"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "회원가입에 실패했습니다.");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen city-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🌃</span>
            <span className="text-2xl font-bold neon-text text-blue-300">
              CityBoard
            </span>
          </Link>
        </div>

        <Card className="bg-black/40 backdrop-blur-md border-white/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-white">회원가입</CardTitle>
            <CardDescription className="text-white/60">
              CityBoard의 멤버가 되어보세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-sm p-3 rounded-md">
                  {error}
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
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/80" htmlFor="nickname">
                  닉네임
                </label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="게시판에서 사용할 이름"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  {...register("nickname")}
                />
                {errors.nickname && (
                  <p className="text-xs text-red-400">{errors.nickname.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/80" htmlFor="password">
                  비밀번호
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="8자 이상, 영문/숫자/특수문자"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500"
                disabled={isLoading}
              >
                {isLoading ? "회원가입 중..." : "회원가입"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-white/60">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-blue-400 hover:underline">
                로그인
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
