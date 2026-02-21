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
    ShieldCheck,
    MessageSquare,
    ClipboardList,
    ListTodo,
    UtensilsCrossed,
    Users,
    Camera,
} from "lucide-react";
import {
    DASHBOARD_ROLES,
    OBSERVER_TEAM,
    PRESS_TEAM,
    SECURITY_TEAM,
} from "./roles";

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
    requiresDelegation?: boolean;
    subItems?: NavigationSubItem[];
}

// 1. Dashboard Items (Delegates, Chairs)
export const participantItems: NavigationItem[] = [
    {
        title: "Genel Durum",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: DASHBOARD_ROLES,
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Profilim",
        href: "/profile",
        icon: User,
        roles: DASHBOARD_ROLES,
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Ödeme",
        href: "/payment",
        icon: CreditCard,
        roles: ["applicant", "delegate"],
        mobileCore: false,
        requiresApproved: true, // Kullanıcı onaylanmadan ödemeyi göremez
    },
    {
        title: "Delegasyon",
        href: "/dashboard/delegation",
        icon: Users,
        roles: ["applicant", "delegate"],
        mobileCore: false,
        requiresApproved: false, // Delegasyon davetine yanıt verebilmesi için onaysızken de görmeli
        requiresDelegation: true,
    },
    {
        title: "Komitem",
        href: "/dashboard/committee",
        icon: Briefcase,
        roles: ["delegate", "committee_chairman", "chair"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Yoklama Yönetimi",
        href: "/dashboard/committee/roll-call",
        icon: QrCode,
        roles: ["committee_chairman", "chair"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Ortak Çalışma",
        href: "/dashboard/editor",
        icon: PenTool,
        roles: ["delegate", "committee_chairman", "chair"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Tanıştıklarım",
        href: "/connections",
        icon: UsersRound,
        roles: DASHBOARD_ROLES,
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Kaynaklar",
        href: "/resources",
        icon: FolderOpen,
        roles: DASHBOARD_ROLES,
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Duyurular",
        href: "/announcements",
        icon: Megaphone,
        roles: DASHBOARD_ROLES,
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Yemek",
        href: "/catering",
        icon: UtensilsCrossed,
        roles: DASHBOARD_ROLES,
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Destek",
        href: "/tickets",
        icon: MessageSquare,
        roles: DASHBOARD_ROLES,
        mobileCore: false,
        requiresApproved: false,
    },
];

// 2. Organisation Items (Observers, Press, Security)
export const organisationItems: NavigationItem[] = [
    {
        title: "Genel Durum",
        href: "/organisation",
        icon: LayoutDashboard,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Profilim",
        href: "/profile",
        icon: User,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Ödeme",
        href: "/payment",
        icon: CreditCard,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM],
        mobileCore: false,
        requiresApproved: true,
    },
    // Observer Specific
    {
        title: "Görev Oluştur",
        href: "/organisation/observers/tasks",
        icon: ClipboardList,
        roles: ["head_observer"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Görevlerim",
        href: "/organisation/observers/my-tasks",
        icon: ListTodo,
        roles: OBSERVER_TEAM,
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Gözlemci Atama",
        href: "/organisation/observers/assign",
        icon: Users,
        roles: ["head_observer"],
        mobileCore: true,
        requiresApproved: true,
    },
    // Press Specific
    {
        title: "Basın Galerisi",
        href: "/organisation/press/gallery",
        icon: Camera,
        roles: PRESS_TEAM,
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Dosya Yükle",
        href: "/organisation/press/upload",
        icon: FolderOpen,
        roles: PRESS_TEAM,
        mobileCore: true,
        requiresApproved: true,
    },
    // Security Specific
    {
        title: "QR Tara",
        href: "/organisation/security/scan",
        icon: ScanLine,
        roles: SECURITY_TEAM,
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Giriş Logları",
        href: "/organisation/security/logs",
        icon: ShieldCheck,
        roles: ["head_security"],
        mobileCore: false,
        requiresApproved: true,
    },
    // Shared Org Items
    {
        title: "Tanıştıklarım",
        href: "/connections",
        icon: UsersRound,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Yemek",
        href: "/catering",
        icon: UtensilsCrossed,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Duyurular",
        href: "/announcements",
        icon: Megaphone,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Destek",
        href: "/tickets",
        icon: MessageSquare,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: false,
        requiresApproved: false,
    }
];