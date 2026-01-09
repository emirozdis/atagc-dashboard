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
        const userAgent = (req?.headers as any)?.["user-agent"] || "Unknown";

        try {
          await loginLimiter.check(5, ip);
        } catch {
          throw new Error("Çok fazla giriş denemesi. Lütfen 1 dakika bekleyin.");
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 1. Fetch user
        const { data: user, error } = await supabase
          .from("users")
          .select("*, user_details(profile_picture_url)")
          .eq("email", credentials.email)
          .single();

        if (error || !user) {
          return null;
        }

        if (user.is_suspended) {
          throw new Error("Hesabınız askıya alınmıştır.");
        }

        // 2. Check Maintenance Mode
        const { data: settings } = await supabase
          .from("system_settings")
          .select("maintenance_mode")
          .single();

        if (settings?.maintenance_mode && user.role !== "superadmin" && user.role !== "admin") {
          return null;
        }

        // 3. Verify password
        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        // 4. Create Active Session in DB
        const { data: sessionData, error: sessionError } = await supabase
          .from("active_sessions")
          .insert({
            user_id: user.id,
            ip_address: ip,
            user_agent: userAgent,
            last_active: new Date().toISOString()
          })
          .select("id")
          .single();

        if (sessionError || !sessionData) {
          throw new Error("Oturum başlatılamadı (DB Error).");
        }

        await logAction(user.id, "login_success", { role: user.role, session_id: sessionData.id });

        const userDetails = Array.isArray(user.user_details) ? user.user_details[0] : user.user_details;
        
        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
          image: userDetails?.profile_picture_url || null,
          sessionId: sessionData.id, 
        };
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
      }
      if (trigger === "update" && session?.user?.image) {
        token.picture = session.user.image;
      }
      return token;
    },
    async session({ session, token }) {
      // 5. VALIDATE SESSION ON EVERY REQUEST
      if (token && token.sessionId) {
        const { data: activeSession } = await supabase
          .from("active_sessions")
          .select(`
            id, 
            last_active,
            user:users (
              is_suspended,
              role
            )
          `)
          .eq("id", token.sessionId)
          .single();

        // Check if session exists in DB
        if (!activeSession) {
          return null as any; 
        }

        // Fix: Supabase might return relation as array or single object depending on types
        // Safely extract the user object
        const user = Array.isArray(activeSession.user) 
          ? activeSession.user[0] 
          : activeSession.user;

        // Check if user exists and is not suspended
        if (!user || user.is_suspended) {
          return null as any; 
        }

        // Apply to session object
        if (session.user) {
          session.user.id = token.id;
          session.user.role = user.role as any; // Sync role from DB
          session.user.image = token.picture;
          session.user.sessionId = token.sessionId;
        }
        return session;
      }
      return session; 
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Change Log:
// - Fixed TypeScript error in `session` callback by handling `activeSession.user` as potentially an array.
// - Added specific check `Array.isArray(activeSession.user) ? activeSession.user[0] : activeSession.user` to safely access user properties.