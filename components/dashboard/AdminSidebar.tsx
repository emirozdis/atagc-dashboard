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
    FileEdit
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const adminItems = [
    {
        title: "Panel",
        href: "/admin",
        icon: LayoutDashboard,
        roles: ["superadmin", "admin", "committee_chairman", "deputy_chair"]
    },
    {
        title: "Başvurular",
        href: "/admin/applications",
        icon: FileText,
        roles: ["superadmin", "admin"]
    },
    {
        title: "Formlar",
        href: "/admin/forms",
        icon: FileEdit,
        roles: ["superadmin"]
    },
    {
        title: "Kullanıcılar",
        href: "/admin/users",
        icon: Users,
        roles: ["superadmin", "admin", "committee_chairman", "deputy_chair"]
    },
    {
        title: "Komiteler",
        href: "/admin/committees",
        icon: CalendarDays,
        roles: ["superadmin", "admin"]
    },
    {
        title: "Yoklama",
        href: "/admin/roll-call",
        icon: QrCode,
        roles: ["superadmin", "admin", "committee_chairman", "deputy_chair"]
    },
    {
        title: "Kaynaklar",
        href: "/admin/resources",
        icon: FolderOpen,
        roles: ["superadmin", "admin", "committee_chairman", "deputy_chair"]
    },
        {
        title: "Ödemeler", 
        href: "/admin/payments",
        icon: CreditCard,
        roles: ["superadmin", "admin"]
    },
    {
        title: "Duyurular",
        href: "/admin/announcements",
        icon: Megaphone,
        roles: ["superadmin", "admin"]
    },
    {
        title: "Sistem Kayıtları",
        href: "/admin/logs",
        icon: ScrollText,
        roles: ["superadmin", "admin"]
    },
    {
        title: "Profilim",
        href: "/admin/profile",
        icon: User,
        roles: ["superadmin", "admin", "committee_chairman", "deputy_chair"]
    },
    {
        title: "Ayarlar",
        href: "/admin/settings",
        icon: Settings,
        roles: ["superadmin"]
    },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = session?.user?.role;

    const filteredItems = adminItems.filter(item => !item.roles || item.roles.includes(role || ""));

    const getRoleTag = () => {
        if (role === 'superadmin' || role === 'admin') return "Yönetim";
        if (role === 'committee_chairman' || role === 'deputy_chair') return "Akademi";
        return null;
    };

    const roleTag = getRoleTag();

    return (
        <div className="flex flex-col h-full bg-sidebar border-r border-border w-64">
            <div className="p-6 border-b border-border">
                <Link href="/admin" className="flex items-center gap-3">
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

// Change Log:
// - Added "Formlar" menu item.
// - Implemented role-based filtering for Admin Sidebar.