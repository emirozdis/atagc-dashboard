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
        mobileCore: true
    },
    {
        title: "Komitem",
        href: "/dashboard/committee",
        icon: Briefcase,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true
    },
    {
        title: "Ortak Çalışma",
        href: "/dashboard/editor",
        icon: PenTool,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false
    },
    {
        title: "Yoklama Yönetimi",
        href: "/dashboard/committee/roll-call",
        icon: QrCode,
        roles: ["committee_chairman", "deputy_chair"],
        mobileCore: false
    },
    {
        title: "Tara",
        href: "/dashboard/scan",
        icon: ScanLine,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true
    },
    {
        title: "Tanıştıklarım",
        href: "/dashboard/connections",
        icon: UsersRound,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true
    },
    {
        title: "Kaynaklar",
        href: "/dashboard/resources",
        icon: FolderOpen,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false
    },
    {
        title: "Duyurular",
        href: "/dashboard/announcements",
        icon: Megaphone,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false
    },
    {
        title: "Profilim",
        href: "/dashboard/profile",
        icon: User,
        roles: ["applicant", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true
    },
];

// Change Log:
// - Added "Tanıştıklarım" (Connections) navigation item with `UsersRound` icon.
// - Set `mobileCore: true` to make it accessible in the bottom navigation.