import NextAuth, { type NextAuthConfig } from "next-auth";
import type { OIDCConfig } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import VkProvider from "next-auth/providers/vk";
import YandexProvider from "next-auth/providers/yandex";
import { isDefined } from "./util";
import { UserRole } from "@/types/model";

type OIDCProfile = {
  sub?: string;
  id?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  email?: string;
  picture?: string;
};

// Generic OIDC provider factory (Sber ID, TBank/Tinkoff ID)
function OIDCProvider(
  name: string,
  issuer: string,
  clientId: string,
  clientSecret: string,
  scopes = ["openid", "profile", "email"],
): OIDCConfig<OIDCProfile> {
  return {
    id: name,
    name,
    type: "oidc",
    style: {
      logo: "",
      brandColor: "#000000",
      bg: "",
      text: name,
    },
    issuer,
    clientId,
    clientSecret,
    wellKnown: `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
    authorization: { params: { scope: scopes.join(" ") } },
    checks: ["pkce", "state"],
    profile(profile) {
      return {
        id: profile.sub ?? profile.id ?? "",
        name:
          (profile.name ??
            `${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim()) ||
          profile.preferred_username ||
          null,
        email: profile.email ?? null,
        image: profile.picture ?? null,
      };
    },
  };
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET
      ? YandexProvider({
          clientId: process.env.YANDEX_CLIENT_ID,
          clientSecret: process.env.YANDEX_CLIENT_SECRET,
        })
      : null,
    process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET
      ? VkProvider({
          clientId: process.env.VK_CLIENT_ID,
          clientSecret: process.env.VK_CLIENT_SECRET,
        })
      : null,
    process.env.SBER_CLIENT_ID &&
    process.env.SBER_CLIENT_SECRET &&
    process.env.SBER_ISSUER
      ? OIDCProvider(
          "sber",
          process.env.SBER_ISSUER,
          process.env.SBER_CLIENT_ID,
          process.env.SBER_CLIENT_SECRET,
        )
      : null,
    process.env.TBANK_CLIENT_ID &&
    process.env.TBANK_CLIENT_SECRET &&
    process.env.TBANK_ISSUER
      ? OIDCProvider(
          "tbank",
          process.env.TBANK_ISSUER,
          process.env.TBANK_CLIENT_ID,
          process.env.TBANK_CLIENT_SECRET,
        )
      : null,
  ].filter(isDefined),
  pages: { signIn: "/" },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        session.user.role = user.role ?? UserRole.USER;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
