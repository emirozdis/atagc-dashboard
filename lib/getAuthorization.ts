import { getServerSession, Session } from "next-auth";
import { authOptions } from "./auth";
import { supabase } from "./SERVER_supabase";

type AuthOptions = {
  /** If true, require a logged in user (default true) */
  requireAuth?: boolean;
  /** One or more allowed roles (exact match against session.user.role) */
  allowedRoles?: string | string[];
  /** If true, requires the user to have 'approved' application status (only applies to 'applicant' role) */
  requireApproved?: boolean;
  /** Optional async custom check that receives the session and can perform resource checks
   *  Return { ok: true, payload? } on success or { ok: false, message?, status? } on failure
   */
  customCheck?: (
    session: any,
    supabaseClient: typeof supabase
  ) => Promise<{ ok: boolean; payload?: any; message?: string; status?: number }>;
};

/**
 * getAuthorization centralizes server-side auth checks for API routes.
 * Returns an object with { ok, session, payload?, message?, status? }.
 */
export async function getAuthorization(opts: AuthOptions = {}) {
  const { requireAuth = true, allowedRoles, requireApproved = false, customCheck } = opts;

  const session: Session | null = await getServerSession(authOptions as any);

  if (requireAuth && !session?.user) {
    return { ok: false, status: 401, message: "Unauthorized" };
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
    // Only applies if the user is an 'applicant'. Staff roles are implicitly approved/exempt.
    if (requireApproved && session.user.role === 'applicant') {
      if (session.user.applicationStatus !== 'approved') {
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

// Change Log:
// - Added `requireApproved` option.
// - Implemented logic to block `applicant` users if `applicationStatus` is not `approved`.
// - Staff roles bypass this check automatically.