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
  
  // Superadmin can manage everyone (except theoretically other superadmins, but usually allowed)
  if (actorRole === 'superadmin') return true;
  
  // Actor must be strictly higher rank to manage (warn/ban/edit)
  return actorRank > targetRank;
}

export function isAuthorized(userRole: string, requiredRole: string): boolean {
  return getRoleRank(userRole) >= getRoleRank(requiredRole);
}