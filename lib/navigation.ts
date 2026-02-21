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
    ShieldCheck,
    MessageSquare,
    ClipboardList,
    ListTodo,
    UtensilsCrossed,
    Users
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
    requiresDelegationLeader?: boolean;
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
        title: "Delegasyon",
        href: "/dashboard/delegation",
        icon: Users,
        roles: ["applicant", "delegate"],
        mobileCore: false,
        requiresApproved: false,
        requiresDelegationLeader: true,
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
        roles: ["delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Tanıştıklarım",
        href: "/dashboard/connections",
        icon: UsersRound,
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
        roles: ["delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Yemek",
        href: "/dashboard/catering",
        icon: UtensilsCrossed,
        roles: ["delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Destek",
        href: "/dashboard/tickets",
        icon: MessageSquare,
        roles: ["applicant", "delegate", "press", "observer", "committee_chairman", "deputy_chair", "superadmin"],
        mobileCore: false,
        requiresApproved: false,
    },
];

export const organisationItems: NavigationItem[] = [
    {
        title: "Genel Durum",
        href: "/organisation",
        icon: LayoutDashboard,
        roles: ["observer", "head_observer"],
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Görev Oluştur",
        href: "/organisation/tasks",
        icon: ClipboardList,
        roles: ["head_observer", "admin", "superadmin"],
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Görevlerim",
        href: "/organisation/my-tasks",
        icon: ListTodo,
        roles: ["observer"],
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Gözlemci Atama",
        href: "/organisation/assign-observers",
        icon: ListTodo,
        roles: ["head_observer", 'admin', 'superadmin'],
        mobileCore: true,
        requiresApproved: false,
    },
];

// Change Log:
// - Removed "applicant" from `roles` for: Tara, Tanıştıklarım, Kaynaklar, Duyurular.
// - This ensures users with 'applicant' role (unapproved applications) only see Dashboard, Payment, and Profile.
// - Once approved, their role changes to 'delegate'/'press'/'observer', granting access to other pages.