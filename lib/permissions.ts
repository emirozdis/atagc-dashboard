import { ROLE_METADATA, UserRole, ROLES } from "@/lib/roles";

export function getRoleRank(role: string): number {
  const meta = ROLE_METADATA[role as UserRole];
  return meta ? meta.rank : 0;
}

export function canManageRole(actorRole: string, targetRole: string): boolean {
  const actorRank = getRoleRank(actorRole);
  const targetRank = getRoleRank(targetRole);
  
  // Superadmin can manage everyone (except maybe self, handled in UI)
  if (actorRole === ROLES.SUPERADMIN) return true;
  
  // Actor must be strictly higher rank to manage (warn/ban/edit)
  return actorRank > targetRank;
}

export function isAuthorized(userRole: string, requiredRole: string): boolean {
  return getRoleRank(userRole) >= getRoleRank(requiredRole);
}

// Change Log:
// - Removed hardcoded `ROLE_HIERARCHY`.
// - Now uses `ROLE_METADATA` from `lib/roles` to determine rank.