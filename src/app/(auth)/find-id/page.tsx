"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { findIdSchema, type FindIdInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FindIdPage() {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FindIdInput>({
    resolver: zodResolver(findIdSchema),
  });

  async function onSubmit(data: FindIdInput) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/auth/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "아이디 찾기에 실패했습니다.");
        return;
      }

      setResult(json.maskedEmail);
    } catch {
      setError("아이디 찾기 중 오류가 발생했습니다.");
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
            <CardTitle className="text-2xl text-white">아이디 찾기</CardTitle>
            <CardDescription className="text-white/60">
              닉네임을 입력하면 가입한 이메일 일부를 보여드려요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {result && (
                <div className="rounded-md border border-green-500/30 bg-green-500/20 p-3 text-sm text-green-200">
                  가입한 이메일: <strong>{result}</strong>
                </div>
              )}

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
                {errors.nickname && (
                  <p className="text-xs text-red-400">{errors.nickname.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={isLoading}>
                {isLoading ? "찾는 중..." : "아이디 찾기"}
              </Button>
            </form>

            <div className="mt-6 flex justify-between text-sm text-white/60">
              <Link href="/login" className="text-blue-400 hover:underline">
                로그인으로 돌아가기
              </Link>
              <Link href="/reset-password" className="text-blue-400 hover:underline">
                비밀번호 찾기
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
