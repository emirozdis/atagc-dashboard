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
  icon: any;
  colorClass: string; // Tailwind text color class
  bgClass: string;    // Tailwind bg color class
  borderClass: string; // Tailwind border color class
}> = {
  [ROLES.SUPERADMIN]: {
    label: "Süper Yönetici",
    rank: 100,
    description: "Tam yetki. Tüm sistemi yönetebilir.",
    icon: ShieldAlert,
    colorClass: "text-red-600",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/20"
  },
  [ROLES.ADMIN]: {
    label: "Yönetici",
    rank: 50,
    description: "Sistem yönetimi ve kullanıcı işlemleri.",
    icon: ShieldAlert,
    colorClass: "text-orange-600",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/20"
  },
  [ROLES.CHAIRMAN]: {
    label: "Komite Başkanı",
    rank: 40,
    description: "Atandığı komiteyi yönetir.",
    icon: ShieldCheck,
    colorClass: "text-purple-600",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/20"
  },
  [ROLES.DEPUTY_CHAIR]: {
    label: "Başkan Yardımcısı",
    rank: 30,
    description: "Komite yönetimine yardımcı olur.",
    icon: Shield,
    colorClass: "text-indigo-600",
    bgClass: "bg-indigo-500/10",
    borderClass: "border-indigo-500/20"
  },
  [ROLES.DELEGATE]: {
    label: "Delege",
    rank: 10,
    description: "Komite üyesi. Oylama ve söz hakkı vardır.",
    icon: User,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20"
  },
  [ROLES.APPLICANT]: {
    label: "Başvuru Sahibi",
    rank: 1,
    description: "Henüz onaylanmamış başvuru sahibi.",
    icon: Users,
    colorClass: "text-gray-500",
    bgClass: "bg-gray-500/10",
    borderClass: "border-gray-500/20"
  },
  // Organisation Roles
  [ROLES.HEAD_OBSERVER]: {
    label: "Baş Gözlemci",
    rank: 45,
    description: "Gözlemci ekibini yönetir.",
    icon: Crown,
    colorClass: "text-teal-600",
    bgClass: "bg-teal-500/10",
    borderClass: "border-teal-500/20"
  },
  [ROLES.OBSERVER]: {
    label: "Gözlemci",
    rank: 10,
    description: "Akademik takım gözlemcisi.",
    icon: Eye,
    colorClass: "text-cyan-600",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/20"
  },
  [ROLES.HEAD_PRESS]: {
    label: "Basın Başkanı",
    rank: 45,
    description: "Basın ekibini yönetir.",
    icon: Megaphone,
    colorClass: "text-pink-700",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20"
  },
  [ROLES.PRESS]: {
    label: "Basın",
    rank: 10,
    description: "Basın ekibi üyesi.",
    icon: Camera,
    colorClass: "text-pink-600",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20"
  },
  [ROLES.HEAD_SECURITY]: {
    label: "Güvenlik Şefi",
    rank: 45,
    description: "Güvenlik ekibini yönetir.",
    icon: ShieldAlert,
    colorClass: "text-zinc-800 dark:text-zinc-200",
    bgClass: "bg-zinc-500/10",
    borderClass: "border-zinc-500/20"
  },
  [ROLES.SECURITY]: {
    label: "Güvenlik",
    rank: 10,
    description: "Güvenlik ekibi üyesi.",
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
  if (!user.role) return ROLES.APPLICANT;
  if (user.role === ROLES.APPLICANT && user.applicantType) {
    return user.applicantType as UserRole;
  }
  return user.role as UserRole;
}

/**
 * Returns metadata and visual properties strictly based on actual DB role.
 * Unapproved users will correctly show as "Başvuru Sahibi".
 */
export function getRoleMeta(role?: string) {
  return ROLE_METADATA[(role as UserRole)] || ROLE_METADATA[ROLES.APPLICANT];
}