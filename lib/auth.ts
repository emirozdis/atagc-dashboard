import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/SERVER_supabase";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { ROLES, UserRole } from "@/lib/roles";
import { ApplicationStatusEnum } from "@/types/application";

const loginLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

// Type definitions for DB responses
interface AppFormRelation {
  slug: string;
}

interface ApplicationQueryResponse {
  status: string;
  form: AppFormRelation | AppFormRelation[] | null;
}

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

        // 2. Turnstile Verification
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

        // 3. Maintenance Mode
        const { data: settings } = await supabase
          .from("system_settings")
          .select("maintenance_mode")
          .single();

        if (settings?.maintenance_mode && user.role !== ROLES.SUPERADMIN && user.role !== ROLES.ADMIN) {
          return null;
        }

        // 4. Verify password
        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        // 5. Fetch Application Status & Type
        let appStatus: ApplicationStatusEnum = ApplicationStatusEnum.PENDING;
        let applicantType: UserRole = ROLES.DELEGATE; 

        const { data: appData } = await supabase
          .from("applications")
          .select(`
              status, 
              form:application_forms(slug)
            `)
          .eq("user_id", user.id)
          .maybeSingle();

        const app = appData as unknown as ApplicationQueryResponse | null;

        if (app) {
          if (Object.values(ApplicationStatusEnum).includes(app.status as ApplicationStatusEnum)) {
            appStatus = app.status as ApplicationStatusEnum;
          }

          if (app.form) {
            const form = Array.isArray(app.form) ? app.form[0] : app.form;
            if (form && form.slug) {
                applicantType = Object.values(ROLES).includes(form.slug as UserRole) 
                    ? (form.slug as UserRole) 
                    : ROLES.DELEGATE;
            }
          }
        }

        const explicitRoles: string[] = [ROLES.PRESS, ROLES.OBSERVER, ROLES.DELEGATE];
        if (explicitRoles.includes(user.role)) {
          applicantType = user.role as UserRole;
        }

        const approvedRoles: string[] = [
            ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR, 
            ROLES.DELEGATE, ROLES.PRESS, ROLES.OBSERVER
        ];
        
        if (approvedRoles.includes(user.role)) {
          appStatus = ApplicationStatusEnum.APPROVED;
        }

        // 6. Create Session
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
          role: user.role as UserRole,
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
        token.id = user.id;
        token.role = user.role;
        token.picture = user.image;
        token.sessionId = user.sessionId || "";
        token.applicationStatus = user.applicationStatus;
        token.applicantType = user.applicantType;
      }

      if (trigger === "update") {
        if (session?.user?.image) {
          token.picture = session.user.image;
        }

        const userId = (token.id as string) || token.sub;

        if (userId) {
          const { data: freshUser } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();

          if (freshUser) {
            token.role = freshUser.role as UserRole;

            const explicitRoles: string[] = [ROLES.PRESS, ROLES.OBSERVER, ROLES.DELEGATE];
            if (explicitRoles.includes(freshUser.role)) {
              token.applicantType = freshUser.role as UserRole;
            }

            const { data: appData } = await supabase
              .from("applications")
              .select("status")
              .eq("user_id", userId)
              .maybeSingle();

            const approvedRoles: string[] = [
                ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR, 
                ROLES.DELEGATE, ROLES.PRESS, ROLES.OBSERVER
            ];

            if (appData) {
              if (Object.values(ApplicationStatusEnum).includes(appData.status as ApplicationStatusEnum)) {
                token.applicationStatus = appData.status as ApplicationStatusEnum;
              }
            } else if (approvedRoles.includes(freshUser.role)) {
              token.applicationStatus = ApplicationStatusEnum.APPROVED;
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
          session.user.role = token.role as UserRole;
          session.user.image = token.picture;
          session.user.sessionId = (token.sessionId as string) || "";
          session.user.applicationStatus = token.applicationStatus as ApplicationStatusEnum;
          session.user.applicantType = token.applicantType as UserRole;
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
// - Updated to strictly use `ApplicationStatusEnum`.
// - Replaced `any` casts with proper Interfaces for DB responses.