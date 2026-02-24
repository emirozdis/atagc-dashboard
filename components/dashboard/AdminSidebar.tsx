"use client";

import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    FileText,
    Settings,
    LogOut,
    QrCode,
    CalendarDays,
    Megaphone,
    ScrollText,
    FolderOpen,
    User,
    CreditCard,
    FileEdit,
    MessageSquare,
    UtensilsCrossed,
    Briefcase
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ROLES } from "@/lib/roles";

const adminItems = [
    {
        title: "Panel",
        href: "/admin",
        icon: LayoutDashboard,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR]
    },
    {
        title: "Başvurular",
        href: "/admin/applications",
        icon: FileText,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN]
    },
    {
        title: "Formlar",
        href: "/admin/forms",
        icon: FileEdit,
        roles: [ROLES.SUPERADMIN]
    },
    {
        title: "Kullanıcılar",
        href: "/admin/users",
        icon: Users,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR]
    },
    {
        title: "Delegasyonlar",
        href: "/admin/delegations",
        icon: Briefcase,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN]
    },
    {
        title: "Komiteler",
        href: "/admin/committees",
        icon: CalendarDays,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN]
    },
    {
        title: "Yoklama",
        href: "/admin/roll-call",
        icon: QrCode,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR]
    },
    {
        title: "Destek Talepleri",
        href: "/admin/tickets",
        icon: MessageSquare,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN]
    },
    {
        title: "Kaynaklar",
        href: "/admin/resources",
        icon: FolderOpen,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR]
    },
    {
        title: "Ödemeler",
        href: "/admin/payments",
        icon: CreditCard,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN]
    },
    {
        title: "Yemek Yönetimi",
        href: "/admin/catering",
        icon: UtensilsCrossed,
        roles: ["superadmin", "admin"]
    },
    {
        title: "Duyurular",
        href: "/admin/announcements",
        icon: Megaphone,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN]
    },
    {
        title: "Sistem Kayıtları",
        href: "/admin/logs",
        icon: ScrollText,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN]
    },
    {
        title: "Profilim",
        href: "/admin/profile",
        icon: User,
        roles: [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.DEPUTY_CHAIR]
    },
    {
        title: "Ayarlar",
        href: "/admin/settings",
        icon: Settings,
        roles: [ROLES.SUPERADMIN]
    },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = session?.user?.role;

    const filteredItems = adminItems.filter(item => !item.roles || item.roles.includes(role as any));

    const getRoleTag = () => {
        if (role === ROLES.SUPERADMIN || role === ROLES.ADMIN) return "Yönetim";
        if (role === ROLES.CHAIRMAN || role === ROLES.DEPUTY_CHAIR) return "Akademi";
        return null;
    };

    const roleTag = getRoleTag();

    return (
        <div className="flex flex-col h-full bg-sidebar border-r border-border w-64">
            <div className="p-6 border-b border-border">
                <Link href="/admin" prefetch={false} className="flex items-center gap-3">
                    <img src="/logo.webp" alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="font-display font-bold text-lg text-primary">
                        ATAGÇ
                        {roleTag && (
                            <span className="text-xs ml-2 bg-primary/20 px-1.5 py-0.5 rounded text-primary-foreground">
                                {roleTag}
                            </span>
                        )}
                    </span>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Yönetim Menüsü
                </div>

                {filteredItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            pathname === item.href
                                ? "bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/20"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground border border-transparent"
                        )}
                    >
                        <item.icon className="w-4 h-4" />
                        {item.title}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-border space-y-2">
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Çıkış Yap
                </button>
            </div>
        </div>
    );
}