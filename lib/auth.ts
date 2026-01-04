import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/SERVER_supabase";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

// Rate limit: 5 attempts per minute per IP
const loginLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // 0. Rate Limiting
        const ip = (req?.headers as any)?.["x-forwarded-for"] || "127.0.0.1";
        try {
          await loginLimiter.check(5, ip);
        } catch {
          throw new Error("Çok fazla giriş denemesi. Lütfen 1 dakika bekleyin.");
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. Fetch user from public.users table
        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email)
          .single();

        if (error || !user) {
          return null;
        }

        // 2. Check if user is suspended
        if (user.is_suspended) {
          throw new Error("Hesabınız askıya alınmıştır. Lütfen yönetim ile iletişime geçiniz.");
        }

        // 3. Check System Maintenance Mode
        const { data: settings } = await supabase
          .from("system_settings")
          .select("maintenance_mode")
          .single();

        if (settings?.maintenance_mode) {
          // Allow login only for admins and superadmins
          if (user.role !== "superadmin" && user.role !== "admin") {
            return null;
          }
        }

        // 4. Verify password
        const isValid = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isValid) {
          return null;
        }

        // 5. Log Successful Login
        await logAction(user.id, "login_success", { role: user.role });

        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role as any;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login on error
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Change Log:
// - Implemented rate limiting (5 attempts/min) in `authorize` callback.
// - Added error throwing for rate limit exceeded.