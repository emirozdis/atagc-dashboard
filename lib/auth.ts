import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/SERVER_supabase";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
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
        // Note: 'req' here might differ based on context (NextAuth implementation details), 
        // but we can pass it if available or just log without IP for now.
        // req is available in 'authorize' if using NextAuth v4 with appropriate setup, 
        // but often it's tricky to get full request object in authorize.
        // We will log without detailed request context here if needed.
        
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
// - Imported `logAction` and logging successful login attempts inside `authorize`.