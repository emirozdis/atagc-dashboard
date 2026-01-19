import {
    LayoutDashboard,
    Megaphone,
    Briefcase,
    PenTool,
    User,
    QrCode,
    ScanLine,
    FolderOpen,
    UsersRound,
    CreditCard
} from "lucide-react";

export const participantItems = [
    {
        title: "Genel Durum",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Ödeme",
        href: "/dashboard/payment",
        icon: CreditCard,
        roles: ["applicant", "delegate", "press", "observer"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Komitem",
        href: "/dashboard/committee",
        icon: Briefcase,
        roles: ["delegate", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Ortak Çalışma",
        href: "/dashboard/editor",
        icon: PenTool,
        roles: ["delegate", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Yoklama Yönetimi",
        href: "/dashboard/committee/roll-call",
        icon: QrCode,
        roles: ["committee_chairman", "deputy_chair"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Tara",
        href: "/dashboard/scan",
        icon: ScanLine,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Tanıştıklarım",
        href: "/dashboard/connections",
        icon: UsersRound,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Kaynaklar",
        href: "/dashboard/resources",
        icon: FolderOpen,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Duyurular",
        href: "/dashboard/announcements",
        icon: Megaphone,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Profilim",
        href: "/dashboard/profile",
        icon: User,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: false,
    },
];

// Change Log:
// - Removed `allowedTypes` logic entirely. Since `role` now correctly reflects 'delegate', 'press', or 'observer', we rely purely on `roles` array.
// - Added "delegate", "press", "observer" to the `roles` array for all common pages.
// - Excluded "press" and "observer" from "Komitem" (Committee) and "Ortak Çalışma" (Editor) pages.