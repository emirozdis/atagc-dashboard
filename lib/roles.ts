import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Users,
  User,
  Camera,
  Eye,
  Crown,
  Lock,
  Megaphone
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// 1. Role Constants
export const ROLES = {
  // Admin Zone
  SUPERADMIN: "superadmin",
  ADMIN: "admin",

  // Academic / Dashboard Zone
  CHAIRMAN: "committee_chairman",
  DEPUTY_CHAIR: "chair",
  DELEGATE: "delegate",
  APPLICANT: "applicant",

  // Organisation Zone - Observers
  HEAD_OBSERVER: "head_observer",
  OBSERVER: "observer",

  // Organisation Zone - Press
  HEAD_PRESS: "head_press",
  PRESS: "press",

  // Organisation Zone - Security
  HEAD_SECURITY: "head_security",
  SECURITY: "security",
} as const;

// 2. Type Definition
export type UserRole = typeof ROLES[keyof typeof ROLES];

/** Public application types. These are intentionally separate from account and conference roles. */
export const APPLICATION_TYPES = {
  DELEGATE: "delegate",
  CHAIRBOARD: "chairboard",
  DELEGATION: "delegation",
  PRESS: "press",
  OBSERVER: "observer",
} as const;

export type ApplicationType = typeof APPLICATION_TYPES[keyof typeof APPLICATION_TYPES];

export const PUBLIC_APPLICATION_TYPES: ApplicationType[] = [
  APPLICATION_TYPES.DELEGATE,
  APPLICATION_TYPES.CHAIRBOARD,
  APPLICATION_TYPES.DELEGATION,
  APPLICATION_TYPES.PRESS,
  APPLICATION_TYPES.OBSERVER,
];

/** Platform privileges are separate from a user's conference assignment. */
export const SITE_ADMIN_ROLES: UserRole[] = [ROLES.ADMIN, ROLES.SUPERADMIN];

export const CONFERENCE_ASSIGNMENT_ROLES: UserRole[] = [
  ROLES.DELEGATE,
  ROLES.CHAIRMAN,
  ROLES.DEPUTY_CHAIR,
  ROLES.PRESS,
  ROLES.HEAD_PRESS,
  ROLES.OBSERVER,
  ROLES.HEAD_OBSERVER,
  ROLES.SECURITY,
  ROLES.HEAD_SECURITY,
];

// 3. Role Groups (For Middleware & Access Control)

// Group 1: /admin
export const ADMIN_ROLES: UserRole[] = [
  ROLES.SUPERADMIN,
  ROLES.ADMIN
];

// Group 2: /dashboard
export const DASHBOARD_ROLES: UserRole[] = [
  ROLES.CHAIRMAN,
  ROLES.DEPUTY_CHAIR,
  ROLES.DELEGATE,
  ROLES.APPLICANT
];

// Group 3: /organisation
export const ORGANISATION_ROLES: UserRole[] = [
  ROLES.HEAD_OBSERVER,
  ROLES.OBSERVER,
  ROLES.HEAD_PRESS,
  ROLES.PRESS,
  ROLES.HEAD_SECURITY,
  ROLES.SECURITY
];

// Sub-groups within Organisation for internal permission checks
export const OBSERVER_TEAM: UserRole[] = [ROLES.HEAD_OBSERVER, ROLES.OBSERVER];
export const PRESS_TEAM: UserRole[] = [ROLES.HEAD_PRESS, ROLES.PRESS];
export const SECURITY_TEAM: UserRole[] = [ROLES.HEAD_SECURITY, ROLES.SECURITY];

// Legacy / Helper Arrays
export const STAFF_ROLES: UserRole[] = [
  ...ADMIN_ROLES,
  ROLES.CHAIRMAN,
  ROLES.DEPUTY_CHAIR,
  ...ORGANISATION_ROLES.filter(r => r !== ROLES.OBSERVER && r !== ROLES.PRESS && r !== ROLES.SECURITY) // Heads are staff
];

export const MANAGEMENT_ROLES: UserRole[] = ADMIN_ROLES;

export const COMMITTEE_LEADS: UserRole[] = [
  ROLES.CHAIRMAN,
  ROLES.DEPUTY_CHAIR
];

export const PARTICIPANT_ROLES: UserRole[] = [
  ROLES.DELEGATE,
  ROLES.APPLICANT
];

// 4. Role Metadata
export const ROLE_METADATA: Record<UserRole, {
  label: string;
  rank: number; // Higher number = Higher authority
  description: string;
  icon: LucideIcon;
  colorClass: string; // Tailwind text color class
  bgClass: string;    // Tailwind bg color class
  borderClass: string; // Tailwind border color class
}> = {
  [ROLES.SUPERADMIN]: {
    label: "Super Admin",
    rank: 100,
    description: "Full access to the conference platform.",
    icon: ShieldAlert,
    colorClass: "text-red-600",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/20"
  },
  [ROLES.ADMIN]: {
    label: "Site Admin",
    rank: 50,
    description: "Manages the platform and participant accounts.",
    icon: ShieldAlert,
    colorClass: "text-orange-600",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/20"
  },
  [ROLES.CHAIRMAN]: {
    label: "Committee Chair",
    rank: 40,
    description: "Leads the assigned committee.",
    icon: ShieldCheck,
    colorClass: "text-purple-600",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/20"
  },
  [ROLES.DEPUTY_CHAIR]: {
    label: "Deputy Chair",
    rank: 30,
    description: "Supports the committee leadership team.",
    icon: Shield,
    colorClass: "text-indigo-600",
    bgClass: "bg-indigo-500/10",
    borderClass: "border-indigo-500/20"
  },
  [ROLES.DELEGATE]: {
    label: "Delegate",
    rank: 10,
    description: "A committee member with speaking and voting rights.",
    icon: User,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20"
  },
  [ROLES.APPLICANT]: {
    label: "Applicant",
    rank: 1,
    description: "An applicant whose placement has not been approved.",
    icon: Users,
    colorClass: "text-gray-500",
    bgClass: "bg-gray-500/10",
    borderClass: "border-gray-500/20"
  },
  // Organisation Roles
  [ROLES.HEAD_OBSERVER]: {
    label: "Head of Administrative Staff",
    rank: 45,
    description: "Leads the administrative staff.",
    icon: Crown,
    colorClass: "text-teal-600",
    bgClass: "bg-teal-500/10",
    borderClass: "border-teal-500/20"
  },
  [ROLES.OBSERVER]: {
    label: "Administrative Staff",
    rank: 10,
    description: "A member of the administrative staff.",
    icon: Eye,
    colorClass: "text-cyan-600",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/20"
  },
  [ROLES.HEAD_PRESS]: {
    label: "Head of Press",
    rank: 45,
    description: "Leads the press team.",
    icon: Megaphone,
    colorClass: "text-pink-700",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20"
  },
  [ROLES.PRESS]: {
    label: "Press",
    rank: 10,
    description: "A member of the press team.",
    icon: Camera,
    colorClass: "text-pink-600",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20"
  },
  [ROLES.HEAD_SECURITY]: {
    label: "Head of Security",
    rank: 45,
    description: "Leads the security team.",
    icon: ShieldAlert,
    colorClass: "text-zinc-800 dark:text-zinc-200",
    bgClass: "bg-zinc-500/10",
    borderClass: "border-zinc-500/20"
  },
  [ROLES.SECURITY]: {
    label: "Security",
    rank: 10,
    description: "A member of the security team.",
    icon: Lock,
    colorClass: "text-zinc-600 dark:text-zinc-400",
    bgClass: "bg-zinc-500/10",
    borderClass: "border-zinc-500/20"
  }
};

/**
 * Helper to determine the true effective role of a user for routing and permissions.
 * If they are 'applicant', it evaluates their submitted form to show their targeted role.
 */
export function getEffectiveRole(user: { role?: string | UserRole, applicantType?: string | UserRole }): UserRole {
  // An application target is not a permission. Conference access starts only
  // after an administrator creates a conference assignment in `role`.
  return (user.role as UserRole) || ROLES.APPLICANT;
}

/**
 * Returns metadata and visual properties strictly based on actual DB role.
 * Unapproved users will correctly show as "Applicant".
 */
export function getRoleMeta(role?: string) {
  return ROLE_METADATA[(role as UserRole)] || ROLE_METADATA[ROLES.APPLICANT];
}
