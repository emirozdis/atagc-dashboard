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
    CreditCard,
    UserPlus,
    Send,
    BarChart,
    Shield,
    Smartphone,
    Building2,
    Globe,
    ShieldCheck
} from "lucide-react";

export interface NavigationSubItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    keywords?: string[];
}

export interface NavigationItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: string[];
    mobileCore: boolean;
    requiresApproved: boolean;
    subItems?: NavigationSubItem[];
}

export const participantItems: NavigationItem[] = [
    {
        title: "Genel Durum",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Profilim",
        href: "/dashboard/profile",
        icon: User,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: false,
        subItems: [
            {
                title: "Kişisel Bilgiler",
                href: "/dashboard/profile#personal",
                icon: User,
                keywords: ["kişisel", "personal", "bilgi", "info", "detay"]
            },
            {
                title: "Dijital Kimlik",
                href: "/dashboard/profile#digital-id",
                icon: ShieldCheck,
                keywords: ["dijital", "digital", "kimlik", "id", "kart", "card", "qr"]
            },
            {
                title: "Güvenlik",
                href: "/dashboard/profile#security",
                icon: Shield,
                keywords: ["güvenlik", "security", "şifre", "password", "ayarlar", "settings"]
            },
            {
                title: "Cihazlar",
                href: "/dashboard/profile#devices",
                icon: Smartphone,
                keywords: ["cihaz", "device", "oturum", "session", "giriş"]
            }
        ]
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
        title: "Komitem",
        href: "/dashboard/committee",
        icon: Briefcase,
        roles: ["delegate", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
        subItems: [
            {
                title: "Oylama Merkezi",
                href: "/dashboard/committee#voting",
                icon: BarChart,
                keywords: ["oylama", "vote", "poll", "ballot"]
            }
        ]
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
        title: "Ortak Çalışma",
        href: "/dashboard/editor",
        icon: PenTool,
        roles: ["delegate", "committee_chairman", "deputy_chair", "superadmin"],
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
        subItems: [
            {
                title: "Bağlantılar",
                href: "/dashboard/connections#list",
                icon: UsersRound,
                keywords: ["bağlantı", "connection", "list", "liste"]
            },
            {
                title: "Gelen İstekler",
                href: "/dashboard/connections#pending",
                icon: UserPlus,
                keywords: ["gelen", "incoming", "pending", "istek", "request", "bekleyen"]
            },
            {
                title: "Giden İstekler",
                href: "/dashboard/connections#sent",
                icon: Send,
                keywords: ["giden", "outgoing", "sent", "gönderilen"]
            }
        ]
    },
    {
        title: "Kaynaklar",
        href: "/dashboard/resources",
        icon: FolderOpen,
        // Removed 'applicant'
        roles: ["delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
        subItems: [
            {
                title: "Komite Kaynakları",
                href: "/dashboard/resources#committee",
                icon: Building2,
                keywords: ["komite", "committee", "özel"]
            },
            {
                title: "Genel Kaynaklar",
                href: "/dashboard/resources#general",
                icon: Globe,
                keywords: ["genel", "general", "public", "herkes"]
            }
        ]
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