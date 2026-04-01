import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  providers: [
    // ── Credentials (이메일/비밀번호) ──
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        // 차단된 사용자
        if (user.isBlocked) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.nickname,
          image: user.profileImage ?? undefined,
          role: user.role,
        } as any;
      },
    }),

    // ── Google OAuth ──
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? "Unknown",
          email: profile.email!,
          image: profile.picture,
        } as any;
      },
    }),

    // ── Kakao OAuth ──
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id?.toString() ?? "",
          name: profile.properties?.nickname ?? "KakaoUser",
          email: profile.kakao_account?.email,
          image: profile.properties?.profile_image,
        } as any;
      },
    }),

    // ── Naver OAuth ──
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.response?.uuid ?? "",
          name: profile.response?.nickname ?? "NaverUser",
          email: profile.response?.email,
          image: profile.response?.profile_image,
        } as any;
      },
    }),

    // ── GitHub OAuth ──
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id?.toString() ?? "",
          name: profile.name ?? profile.login ?? "GitHubUser",
          email: profile.email!,
          image: profile.avatar_url,
        } as any;
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // 첫 로그인 시
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }

      // OAuth 로그인 시 DB에 사용자 upsert
      if (account && account.type === "oauth") {
        const existingUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        });

        if (!existingUser) {
          // OAuth 사용자가 처음 로그인하면 자동 회원가입
          const newUser = await prisma.user.create({
            data: {
              email: token.email as string,
              nickname: (token.name as string) ?? `user_${Date.now()}`,
              profileImage: token.picture ?? null,
              role: "USER",
            },
          });
          token.id = newUser.id;
        } else {
          token.id = existingUser.id;
          token.role = existingUser.role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },

    async signIn({ user, account }) {
      // 차단된 사용자 차단
      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser?.isBlocked) {
          return false;
        }
      }
      return true;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7일
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
