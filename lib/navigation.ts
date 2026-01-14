import {
    LayoutDashboard,
    Megaphone,
    Briefcase,
    PenTool,
    User,
    QrCode,
    ScanLine,
    FolderOpen,
    UsersRound
} from "lucide-react";

export const participantItems = [
    {
        title: "Genel Durum",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: false
    },
    {
        title: "Komitem",
        href: "/dashboard/committee",
        icon: Briefcase,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true
    },
    {
        title: "Ortak Çalışma",
        href: "/dashboard/editor",
        icon: PenTool,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true
    },
    {
        title: "Yoklama Yönetimi",
        href: "/dashboard/committee/roll-call",
        icon: QrCode,
        roles: ["committee_chairman", "deputy_chair"],
        mobileCore: false,
        requiresApproved: true // Implicit for staff, but good to mark
    },
    {
        title: "Tara",
        href: "/dashboard/scan",
        icon: ScanLine,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true
    },
    {
        title: "Tanıştıklarım",
        href: "/dashboard/connections",
        icon: UsersRound,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true
    },
    {
        title: "Kaynaklar",
        href: "/dashboard/resources",
        icon: FolderOpen,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true
    },
    {
        title: "Duyurular",
        href: "/dashboard/announcements",
        icon: Megaphone,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true
    },
    {
        title: "Profilim",
        href: "/dashboard/profile",
        icon: User,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: false
    },
];

// Change Log:
// - Added `requiresApproved` flag to all items.
// - `Genel Durum` (Dashboard) and `Profilim` (Profile) are `false` (Accessible by pending).
// - All other advanced pages are `true`.