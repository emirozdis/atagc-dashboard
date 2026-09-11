import { getServerSession, Session } from "next-auth";
import { authOptions } from "./auth";
import { supabase } from "./SERVER_supabase";
import "server-only";
import { getCurrentAuthorizationState } from "@/lib/authorization-state";
import { ApplicationStatusEnum } from "@/types/application";

type AuthOptions = {
  /** If true, require a logged in user (default true) */
  requireAuth?: boolean;
  /** One or more allowed roles (exact match against session.user.role) */
  allowedRoles?: string | string[];
  /** If true, requires the user to have 'approved' application status (only applies to 'applicant' role) */
  requireApproved?: boolean;
  /** Optional async custom check that receives the session and can perform resource checks */
  customCheck?: (
    session: Session | null,
    supabaseClient: typeof supabase
  ) => Promise<{ ok: boolean; payload?: unknown; message?: string; status?: number }>;
};

/**
 * getAuthorization centralizes server-side auth checks for API routes.
 * It uses a caching strategy to validate session revocation status efficiently.
 */
export async function getAuthorization(opts: AuthOptions = {}) {
  const { requireAuth = true, allowedRoles, requireApproved = false, customCheck } = opts;

  const session: Session | null = await getServerSession(authOptions);

  if (requireAuth) {
    if (!session?.user) {
      return { ok: false, status: 401, message: "Unauthorized" };
    }

    // Session revocation must take effect immediately. Do not trust a
    // process-local cache for authorization decisions.
    const sessionId = session.user.sessionId;
    
    if (sessionId) {
      let activeSession: { id: string } | null = null;
      let sessionError: { message?: string } | null = null;
      let authorizationState: Awaited<ReturnType<typeof getCurrentAuthorizationState>> | null = null;
      try {
        const [activeSessionResult, currentAuthorizationState] = await Promise.all([
          supabase
            .from("active_sessions")
            .select("id")
            .eq("id", sessionId)
            .is("revoked_at", null)
            .gt("expires_at", new Date().toISOString())
            .maybeSingle(),
          getCurrentAuthorizationState(session.user.id),
        ]);
        activeSession = activeSessionResult.data;
        sessionError = activeSessionResult.error;
        authorizationState = currentAuthorizationState;
      } catch {
        return { ok: false, status: 401, message: "Session revoked or expired" };
      }

      if (sessionError || !activeSession || !authorizationState) {
        return { ok: false, status: 401, message: "Session revoked or expired" };
      }
      if (authorizationState.isSuspended) return { ok: false, status: 403, message: "Account suspended" };

      // A JWT can outlive an admin role change. Always authorize with the
      // current database role so demotions take effect immediately.
      session.user.role = authorizationState.role;
      session.user.applicantType = authorizationState.applicantType;
      session.user.committeeId = authorizationState.committeeId;
      session.user.applicationStatus = authorizationState.applicationStatus;
    } else {
       return { ok: false, status: 401, message: "Invalid session token structure" };
    }
  }

  if (session?.user) {
    // Role Check
    if (allowedRoles) {
      const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const userRole = session.user.role;

      if (!userRole || !allowed.includes(userRole)) {
        return { ok: false, status: 403, message: "Forbidden: Insufficient Permissions" };
      }
    }

    // Approval Check (Pending State Restriction)
    if (requireApproved && session.user.role === 'applicant') {
      if (![ApplicationStatusEnum.APPROVED, ApplicationStatusEnum.ACCEPTED].includes(session.user.applicationStatus as ApplicationStatusEnum)) {
        return { ok: false, status: 403, message: "Forbidden: Your application is not approved yet." };
      }
    }
  }

  if (customCheck) {
    try {
      const result = await customCheck(session, supabase);
      if (!result.ok) {
        return { ok: false, status: result.status ?? 401, message: result.message ?? "Unauthorized" };
      }
      return { ok: true, session, payload: result.payload };
    } catch (err) {
      console.error("Authorization customCheck error:", err);
      return { ok: false, status: 500, message: "Authorization check failed" };
    }
  }

  return { ok: true, session };
}

export default getAuthorization;
