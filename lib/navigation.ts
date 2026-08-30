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
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: DASHBOARD_ROLES,
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Profile",
        href: "/profile",
        icon: User,
        roles: DASHBOARD_ROLES,
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Payment",
        href: "/payment",
        icon: CreditCard,
        roles: ["applicant", "delegate"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Delegation",
        href: "/dashboard/delegation",
        icon: Users,
        roles: ["applicant", "delegate"],
        mobileCore: false,
        requiresApproved: false,
        requiresDelegation: true,
    },
    {
        title: "My committee",
        href: "/dashboard/committee",
        icon: Briefcase,
        roles: ["delegate", "committee_chairman", "chair"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Roll call",
        href: "/dashboard/committee/roll-call",
        icon: QrCode,
        roles: ["committee_chairman", "chair"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Collaborative document",
        href: "/dashboard/editor",
        icon: PenTool,
        roles: ["delegate", "committee_chairman", "chair"],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Connections",
        href: "/connections",
        icon: UsersRound,
        roles: DASHBOARD_ROLES,
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Resources",
        href: "/resources",
        icon: FolderOpen,
        roles: DASHBOARD_ROLES,
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Announcements",
        href: "/announcements",
        icon: Megaphone,
        roles: DASHBOARD_ROLES,
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Catering",
        href: "/catering",
        icon: UtensilsCrossed,
        roles: DASHBOARD_ROLES,
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Gallery",
        href: "/gallery",
        icon: Camera,
        roles: DASHBOARD_ROLES,
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Support",
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
        title: "Overview",
        href: "/organisation",
        icon: LayoutDashboard,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Profile",
        href: "/profile",
        icon: User,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: true,
        requiresApproved: false,
    },
    {
        title: "Payment",
        href: "/payment",
        icon: CreditCard,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM],
        mobileCore: false,
        requiresApproved: true,
    },
    // Observer Specific
    {
        title: "Create task",
        href: "/organisation/observers/tasks",
        icon: ClipboardList,
        roles: ["head_observer"],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "My tasks",
        href: "/organisation/observers/my-tasks",
        icon: ListTodo,
        roles: OBSERVER_TEAM,
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Assign observers",
        href: "/organisation/observers/assign",
        icon: Users,
        roles: ["head_observer"],
        mobileCore: true,
        requiresApproved: true,
    },
    // Press Specific
    {
        title: "Press gallery",
        href: "/gallery",
        icon: Camera,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Upload file",
        href: "/organisation/press/upload",
        icon: FolderOpen,
        roles: PRESS_TEAM,
        mobileCore: true,
        requiresApproved: true,
    },
    // Security Specific
    {
        title: "Scan QR code",
        href: "/organisation/security/scan",
        icon: ScanLine,
        roles: SECURITY_TEAM,
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Entry logs",
        href: "/organisation/security/logs",
        icon: ShieldCheck,
        roles: ["head_security"],
        mobileCore: false,
        requiresApproved: true,
    },
    // Shared Org Items
    {
        title: "Connections",
        href: "/connections",
        icon: UsersRound,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: true,
        requiresApproved: true,
    },
    {
        title: "Catering",
        href: "/catering",
        icon: UtensilsCrossed,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Announcements",
        href: "/announcements",
        icon: Megaphone,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: false,
        requiresApproved: true,
    },
    {
        title: "Support",
        href: "/tickets",
        icon: MessageSquare,
        roles: [...OBSERVER_TEAM, ...PRESS_TEAM, ...SECURITY_TEAM],
        mobileCore: false,
        requiresApproved: false,
    }
];
