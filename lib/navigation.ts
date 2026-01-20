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
        requiresApproved: false, 
    },
    {
        title: "Profilim",
        href: "/dashboard/profile",
        icon: User,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: false,
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
        // Removed 'applicant' - only approved roles can access
        roles: ["delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Tanıştıklarım",
        href: "/dashboard/connections",
        icon: UsersRound,
        // Removed 'applicant'
        roles: ["delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Kaynaklar",
        href: "/dashboard/resources",
        icon: FolderOpen,
        // Removed 'applicant'
        roles: ["delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Duyurular",
        href: "/dashboard/announcements",
        icon: Megaphone,
        // Removed 'applicant'
        roles: ["delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
    },
];

// Change Log:
// - Removed "applicant" from `roles` for: Tara, Tanıştıklarım, Kaynaklar, Duyurular.
// - This ensures users with 'applicant' role (unapproved applications) only see Dashboard, Payment, and Profile.
// - Once approved, their role changes to 'delegate'/'press'/'observer', granting access to other pages.