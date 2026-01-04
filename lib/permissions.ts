// Higher number = Higher rank
const ROLE_HIERARCHY: Record<string, number> = {
  "applicant": 1,
  "staff": 2,
  "staffleader": 3,
  "committee_chairman": 4,
  "admin": 5,
  "superadmin": 100
};

export function getRoleRank(role: string): number {
  return ROLE_HIERARCHY[role] || 0;
}

export function canManageRole(actorRole: string, targetRole: string): boolean {
  const actorRank = getRoleRank(actorRole);
  const targetRank = getRoleRank(targetRole);
  
  // Actor must be strictly higher than target to manage them
  // Exception: Superadmin (100) can manage other Superadmins? Usually no, or yes.
  // Let's say strictly higher for safety, except superadmin who is top.
  if (actorRole === 'superadmin') return true;
  
  return actorRank > targetRank;
}

export function isAuthorized(userRole: string, requiredRole: string): boolean {
  return getRoleRank(userRole) >= getRoleRank(requiredRole);
}

/* Change Log:
- Created strict rank-based hierarchy logic.
- Helper functions to compare roles prevents logic errors in API routes.
*/