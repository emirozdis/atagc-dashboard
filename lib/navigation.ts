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
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: false,
        allowedTypes: ["delegate", "press", "observer"]
    },
    {
        title: "Ödeme",
        href: "/dashboard/payment",
        icon: CreditCard,
        roles: ["applicant"],
        mobileCore: false,
        requiresApproved: true,
        allowedTypes: ["delegate", "press", "observer"]
    },
    {
        title: "Komitem",
        href: "/dashboard/committee",
        icon: Briefcase,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
        allowedTypes: ["delegate"] // Only delegates have committees
    },
    {
        title: "Ortak Çalışma",
        href: "/dashboard/editor",
        icon: PenTool,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
        allowedTypes: ["delegate"] // Only delegates write resolutions
    },
    {
        title: "Yoklama Yönetimi",
        href: "/dashboard/committee/roll-call",
        icon: QrCode,
        roles: ["committee_chairman", "deputy_chair"],
        mobileCore: false,
        requiresApproved: true,
        allowedTypes: ["delegate"] // Technically irrelevant for chair, but consistent structure
    },
    {
        title: "Tara",
        href: "/dashboard/scan",
        icon: ScanLine,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
        allowedTypes: ["delegate", "press", "observer"]
    },
    {
        title: "Tanıştıklarım",
        href: "/dashboard/connections",
        icon: UsersRound,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
        allowedTypes: ["delegate", "press", "observer"]
    },
    {
        title: "Kaynaklar",
        href: "/dashboard/resources",
        icon: FolderOpen,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
        allowedTypes: ["delegate", "press", "observer"]
    },
    {
        title: "Duyurular",
        href: "/dashboard/announcements",
        icon: Megaphone,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
        allowedTypes: ["delegate", "press", "observer"]
    },
    {
        title: "Profilim",
        href: "/dashboard/profile",
        icon: User,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: false,
        allowedTypes: ["delegate", "press", "observer"]
    },
];

// Change Log:
// - Added `allowedTypes` array to each navigation item.
// - Restricted "Komitem" and "Ortak Çalışma" to only "delegate".
// - Allowed "press" and "observer" on general dashboard items.