// Higher number = Higher rank
const ROLE_HIERARCHY: Record<string, number> = {
  "applicant": 1,
  "deputy_chair": 2,
  "committee_chairman": 3,
  "admin": 4,
  "superadmin": 100
};

export function getRoleRank(role: string): number {
  return ROLE_HIERARCHY[role] || 0;
}

export function canManageRole(actorRole: string, targetRole: string): boolean {
  const actorRank = getRoleRank(actorRole);
  const targetRank = getRoleRank(targetRole);
  
  // Superadmin can manage everyone (except maybe other superadmins depending on strictness, but we allow it here)
  if (actorRole === 'superadmin') return true;
  
  return actorRank > targetRank;
}

export function isAuthorized(userRole: string, requiredRole: string): boolean {
  return getRoleRank(userRole) >= getRoleRank(requiredRole);
}

// Change Log:
// - Removed 'staff' and 'staffleader' roles.
// - Added 'deputy_chair' role with rank 2 (above applicant, below chairman).
// - Adjusted ranks for chairman and admin accordingly.