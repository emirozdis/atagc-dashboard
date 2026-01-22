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

        // 5. Fetch Application Status & Type
        let appStatus: "pending" | "approved" | "rejected" = "pending";
        let applicantType: "delegate" | "press" | "observer" = "delegate"; // Default

        const { data: app } = await supabase
          .from("applications")
          .select(`
              status, 
              form:application_forms(slug)
            `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (app) {
          appStatus = app.status;
          // @ts-ignore
          if (app.form?.slug) {
            // @ts-ignore
            applicantType = app.form.slug;
          }
        }

        // If user has a specific role like 'press', ensure applicantType matches for consistency
        if (['press', 'observer', 'delegate'].includes(user.role)) {
          applicantType = user.role as any;
        }

        // Admins, Chairs AND Approved Roles (Delegate/Press/Observer) are approved implicitly
        // This ensures that if the DB role is updated to 'delegate', the session status is 'approved'
        // even if the application table fetch had a lag or mismatch.
        if (['superadmin', 'admin', 'committee_chairman', 'deputy_chair', 'delegate', 'press', 'observer'].includes(user.role)) {
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
          applicationStatus: appStatus,
          applicantType: applicantType
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        token.id = user.id;
        token.role = user.role;
        token.picture = user.image;
        token.sessionId = user.sessionId || "";
        token.applicationStatus = user.applicationStatus;
        token.applicantType = user.applicantType;
      }

      // Handle session update triggers (e.g. Profile update or Role change)
      if (trigger === "update") {
        if (session?.user?.image) {
          token.picture = session.user.image;
        }

        // RE-FETCH USER DATA FROM DB to get fresh Role
        const userId = (token.id as string) || token.sub;

        if (userId) {
          const { data: freshUser } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();

          if (freshUser) {
            token.role = freshUser.role;

            // If role is updated, sync applicantType as well
            if (['press', 'observer', 'delegate'].includes(freshUser.role)) {
              token.applicantType = freshUser.role as any;
            }

            // Also refresh Application Status
            const { data: app } = await supabase
              .from("applications")
              .select("status")
              .eq("user_id", userId)
              .maybeSingle();

            if (app) {
              token.applicationStatus = app.status as any;
            } else if (['superadmin', 'admin', 'committee_chairman', 'deputy_chair', 'delegate', 'press', 'observer'].includes(freshUser.role)) {
              token.applicationStatus = "approved";
            }
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && (token.sessionId || token.sub)) {
        if (session.user) {
          session.user.id = (token.id as string) || token.sub || "";
          session.user.role = token.role as any;
          session.user.image = token.picture;
          session.user.sessionId = (token.sessionId as string) || "";
          session.user.applicationStatus = token.applicationStatus as any;
          session.user.applicantType = token.applicantType as any;
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
// - Updated implicit approval logic: Added 'delegate', 'press', 'observer' to the list of roles that are considered "approved" by default in session generation.
// - This ensures that once a user is assigned a specific role (vs generic 'applicant'), the system treats them as approved immediately.