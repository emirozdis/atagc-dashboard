import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/SERVER_supabase";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

// Rate limit: 5 attempts per minute per IP
const loginLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Turnstile Token", type: "text" }, 
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

        // 1. Fetch user first to determine context
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

        // 2. Turnstile Verification Strategy
        let isNewUser = false;
        if (user.created_at) {
            // Since DB uses `timestamptz`, date string includes timezone offset (e.g. 2024-01-01T12:00:00+00:00)
            // Parsing this creates a correct absolute timestamp regardless of server local time.
            const createdTime = new Date(user.created_at).getTime();
            const now = Date.now();
            
            // Standard 5 minute window for auto-login after registration
            const fiveMinutes = 5 * 60 * 1000;
            
            // We use Math.abs to handle minor clock differences, but rely on correct TZ handling now
            if (Math.abs(now - createdTime) < fiveMinutes) {
                isNewUser = true;
            }
        }

        if (!isNewUser) {
            // For existing/older users, strictly verify the token
            const token = credentials.token as string;
            // If token is missing or explicit skip string (from failed frontend logic), fail
            if (!token || token === "SKIPPED_AUTO_LOGIN") {
                 throw new Error("Doğrulama eksik.");
            }

            const isHuman = await verifyTurnstileToken(token);
            if (!isHuman) {
              throw new Error("Doğrulama başarısız. Lütfen sayfayı yenileyip tekrar deneyin.");
            }
        }

        // 3. Check Maintenance Mode
        const { data: settings } = await supabase
          .from("system_settings")
          .select("maintenance_mode")
          .single();

        if (settings?.maintenance_mode && user.role !== "superadmin" && user.role !== "admin") {
          return null;
        }

        // 4. Verify password
        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        // 5. Create Active Session in DB
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
          .maybeSingle();

        if (!activeSession) {
          return null as any; 
        }

        const user = Array.isArray(activeSession.user) 
          ? activeSession.user[0] 
          : activeSession.user;

        if (!user || user.is_suspended) {
          return null as any; 
        }

        if (session.user) {
          session.user.id = token.id;
          session.user.role = user.role as any;
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
// - Removed manual timezone offset checks and string manipulation.
// - Reverted to standard date comparison, relying on `timestamptz` from the database to provide correct absolute time.
// - Kept the 5-minute safety window for new user auto-login.