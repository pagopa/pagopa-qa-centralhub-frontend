import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import { apiClient } from "@/lib/api";
import type { Role } from "@/lib/permissions";
import type { SyncLoginResponse } from "@/types/index";

const ROLE_CHECK_INTERVAL_MS = 60_000;

interface AppJWT extends JWT {
  role: Role;
  isActive: boolean;
  roleCheckedAt?: number;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const result = await apiClient<SyncLoginResponse>("/api/v1/users/sync-login", {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          name: user.name ?? user.email,
          idp_sub: account?.providerAccountId,
        }),
      });
      return result.is_active;
    },
    async jwt({ token, user, account }) {
      const t = token as AppJWT;
      const now = Date.now();
      const shouldRefresh =
        !!user || !t.roleCheckedAt || now - t.roleCheckedAt > ROLE_CHECK_INTERVAL_MS;

      if (shouldRefresh && t.email) {
        const result = await apiClient<SyncLoginResponse>("/api/v1/users/sync-login", {
          method: "POST",
          body: JSON.stringify({
            email: t.email,
            name: t.name ?? t.email,
            idp_sub: account?.providerAccountId,
          }),
        });
        t.role = result.role as Role;
        t.isActive = result.is_active;
        t.roleCheckedAt = now;
      }
      return t;
    },
    session({ session, token }) {
      const t = token as AppJWT;
      if (session.user) {
        session.user.role = t.role;
        session.user.isActive = t.isActive;
      }
      return session;
    },
  },
});
