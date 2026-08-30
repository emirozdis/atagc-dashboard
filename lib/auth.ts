import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { decode as decodeJwt } from "next-auth/jwt";
import { supabase } from "@/lib/SERVER_supabase";
import { consumeLoginExchange } from "@/lib/passwordless";
import { ROLES, UserRole } from "@/lib/roles";
import { ApplicationStatusEnum } from "@/types/application";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "passwordless",
      name: "Passwordless",
      credentials: { exchangeToken: { label: "Exchange token", type: "text" } },
      async authorize(credentials, req) {
        if (!credentials?.exchangeToken) return null;
        const headers = req?.headers as Record<string, string | string[] | undefined> | undefined;
        const forwardedFor = headers?.["x-forwarded-for"];
        const userAgent = headers?.["user-agent"];
        return consumeLoginExchange({
          exchangeToken: String(credentials.exchangeToken),
          ipAddress: Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0]?.trim(),
          userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.picture = user.image;
        token.sessionId = user.sessionId || "";
        token.applicationStatus = user.applicationStatus;
        token.applicantType = user.applicantType;
      }

      if (trigger === "update") {
        if (session?.user?.image) token.picture = session.user.image;
        const userId = (token.id as string) || token.sub;
        if (userId) {
          const [{ data: freshUser }, { data: assignment }, { data: latestApplication }] = await Promise.all([
            supabase.from("users").select("role, account_role").eq("id", userId).maybeSingle(),
            supabase.from("conference_assignments").select("role, committee_id").eq("user_id", userId).maybeSingle(),
            supabase.from("applications").select("application_type, status").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
          ]);
          if (freshUser) token.role = freshUser.account_role === "super_admin" ? ROLES.SUPERADMIN : freshUser.account_role === "site_admin" ? ROLES.ADMIN : (assignment?.role || freshUser.role || ROLES.APPLICANT) as UserRole;
          if (latestApplication && Object.values(ApplicationStatusEnum).includes(latestApplication.status as ApplicationStatusEnum)) token.applicationStatus = latestApplication.status as ApplicationStatusEnum;
          token.committeeId = assignment?.committee_id || null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && (token.sessionId || token.sub) && session.user) {
        session.user.id = (token.id as string) || token.sub || "";
        session.user.role = token.role as UserRole;
        session.user.image = token.picture;
        session.user.sessionId = (token.sessionId as string) || "";
        session.user.applicationStatus = token.applicationStatus as ApplicationStatusEnum;
        session.user.applicantType = token.applicantType as UserRole;
        session.user.committeeId = token.committeeId as string | null;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (token && typeof token.sessionId === "string" && token.sessionId) {
        await supabase.from("active_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", token.sessionId).is("revoked_at", null);
      }
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  jwt: {
    // A browser can retain a token issued by an older deployment. Treat an
    // undecryptable token as an expired session so the user can sign in again.
    decode: async (params) => {
      try {
        return await decodeJwt(params);
      } catch {
        return null;
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
