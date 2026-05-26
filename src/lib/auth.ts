import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { Role } from "@/lib/permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.OIDC_CLIENT_ID!,
      clientSecret: process.env.OIDC_CLIENT_SECRET!,
      issuer: process.env.OIDC_ISSUER,
    }),
  ],
  callbacks: {
    jwt({ token, account, profile }) {
      if (account && profile) {
        const raw = profile as Record<string, unknown>;
        token.role = (raw["role"] ?? raw["roles"] ?? "stakeholder") as Role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { role: Role }).role =
          (token.role as Role) ?? "stakeholder";
      }
      return session;
    },
  },
});
