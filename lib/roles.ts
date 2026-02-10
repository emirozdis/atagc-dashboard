import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Users,
  User,
  Camera,
  Eye,
  Crown
} from "lucide-react";

// 1. Role Constants (The Source of Truth)
export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  CHAIRMAN: "committee_chairman",
  DEPUTY_CHAIR: "chair",
  DELEGATE: "delegate",
  PRESS: "press",
  OBSERVER: "observer",
  HEAD_OBSERVER: "head_observer",
  APPLICANT: "applicant",
} as const;

// 2. Type Definition derived from constants
export type UserRole = typeof ROLES[keyof typeof ROLES];

// 3. Role Groups (Centralized Lists to avoid hardcoding arrays in components)
export const STAFF_ROLES: UserRole[] = [
  ROLES.SUPERADMIN, 
  ROLES.ADMIN, 
  ROLES.CHAIRMAN, 
  ROLES.DEPUTY_CHAIR
];

export const MANAGEMENT_ROLES: UserRole[] = [
  ROLES.SUPERADMIN, 
  ROLES.ADMIN
];

export const COMMITTEE_LEADS: UserRole[] = [
  ROLES.CHAIRMAN, 
  ROLES.DEPUTY_CHAIR
];

export const PARTICIPANT_ROLES: UserRole[] = [
  ROLES.DELEGATE, 
  ROLES.PRESS, 
  ROLES.OBSERVER, 
  ROLES.APPLICANT
];

// 4. Role Metadata (Labels, Ranks, Icons, Colors)
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
  [ROLES.PRESS]: {
    label: "Basın",
    rank: 10,
    description: "Basın ekibi üyesi.",
    icon: Camera,
    colorClass: "text-pink-600",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20"
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
  [ROLES.HEAD_OBSERVER]: {
    label: "Baş Gözlemci",
    rank: 20,
    description: "Gözlemci ekibini yönetir ve görev atar.",
    icon: Crown,
    colorClass: "text-teal-600",
    bgClass: "bg-teal-500/10",
    borderClass: "border-teal-500/20"
  },
  [ROLES.APPLICANT]: {
    label: "Başvuru Sahibi",
    rank: 1,
    description: "Henüz onaylanmamış başvuru sahibi.",
    icon: Users,
    colorClass: "text-gray-500",
    bgClass: "bg-gray-500/10",
    borderClass: "border-gray-500/20"
  }
};

// 5. Helper to get metadata safely
export function getRoleMeta(role: string) {
  return ROLE_METADATA[role as UserRole] || ROLE_METADATA[ROLES.APPLICANT];
}

// Change Log:
// - Added exported arrays `STAFF_ROLES`, `MANAGEMENT_ROLES`, `COMMITTEE_LEADS`, `PARTICIPANT_ROLES`.
// - These arrays are typed as `UserRole[]`, which solves the TypeScript `includes()` incompatibility.