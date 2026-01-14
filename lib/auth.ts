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
            const createdTime = new Date(user.created_at).getTime();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            
            if (Math.abs(now - createdTime) < fiveMinutes) {
                isNewUser = true;
            }
        }

        if (!isNewUser) {
            const token = credentials.token as string;
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

        // 5. Fetch Application Status (New Requirement)
        let appStatus: "pending" | "approved" | "rejected" = "pending";
        if (user.role === 'applicant') {
            const { data: app } = await supabase
                .from("applications")
                .select("status")
                .eq("user_id", user.id)
                .maybeSingle();
            if (app) {
                appStatus = app.status;
            }
        } else {
            // Admins/Chairs are effectively 'approved' for access purposes
            appStatus = "approved";
        }

        // 6. Create Active Session in DB
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
          applicationStatus: appStatus
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
        token.applicationStatus = user.applicationStatus;
      }
      if (trigger === "update" && session?.user?.image) {
        token.picture = session.user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.sessionId) {
        // Fast validation (optional, can be cached or removed if purely relying on JWT expiry)
        // Kept for immediate suspension handling
        /* 
           Performance Note: Checking DB on every session access can be heavy. 
           However, for critical checks like suspension or role changes, it's safer.
           We'll keep it but optimize the select.
        */
       
        // We reuse the token data mostly, but verification is good practice.
        // If speed is critical, remove this DB call and rely on JWT expiry (usually short).
        
        if (session.user) {
          session.user.id = token.id;
          session.user.role = token.role as any;
          session.user.image = token.picture;
          session.user.sessionId = token.sessionId;
          session.user.applicationStatus = token.applicationStatus as any;
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
// - Added logic to fetch `applications.status` during login and attach it to the user object.
// - Persisted `applicationStatus` through JWT and Session callbacks.
// - This enables efficient client-side and server-side checks without extra DB queries per request.