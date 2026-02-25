import { getServerSession, Session } from "next-auth";
import { authOptions } from "./auth";
import { supabase } from "./SERVER_supabase";
import { LRUCache } from "lru-cache";
import "server-only";

// In-memory cache to store valid session IDs for a short time.
// This prevents hitting the database on every single API request
// while still ensuring revoked sessions are caught within 60 seconds.
const sessionValidationCache = new LRUCache<string, boolean>({
  max: 200, // Store up to 2000 active session IDs
  ttl: 1000 * 60, // Cache validity: 60 seconds
});

type AuthOptions = {
  /** If true, require a logged in user (default true) */
  requireAuth?: boolean;
  /** One or more allowed roles (exact match against session.user.role) */
  allowedRoles?: string | string[];
  /** If true, requires the user to have 'approved' application status (only applies to 'applicant' role) */
  requireApproved?: boolean;
  /** Optional async custom check that receives the session and can perform resource checks */
  customCheck?: (
    session: any,
    supabaseClient: typeof supabase
  ) => Promise<{ ok: boolean; payload?: any; message?: string; status?: number }>;
};

/**
 * getAuthorization centralizes server-side auth checks for API routes.
 * It uses a caching strategy to validate session revocation status efficiently.
 */
export async function getAuthorization(opts: AuthOptions = {}) {
  const { requireAuth = true, allowedRoles, requireApproved = false, customCheck } = opts;

  const session: Session | null = await getServerSession(authOptions as any);

  if (requireAuth) {
    if (!session?.user) {
      return { ok: false, status: 401, message: "Unauthorized" };
    }

    // --- OPTIMIZED SECURITY CHECK ---
    const sessionId = session.user.sessionId;
    
    if (sessionId) {
      // 1. Check local cache first
      if (!sessionValidationCache.has(sessionId)) {
        // 2. If not in cache, check Database
        const { data: activeSession } = await supabase
          .from("active_sessions")
          .select("id")
          .eq("id", sessionId)
          .single();
        
        if (!activeSession) {
           return { ok: false, status: 401, message: "Session revoked or expired" };
        }

        // 3. Store in cache if valid
        sessionValidationCache.set(sessionId, true);
      }
      // If validationCache.has(sessionId), we assume it's valid for the TTL duration
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