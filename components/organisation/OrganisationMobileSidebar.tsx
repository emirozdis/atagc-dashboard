"use client";

import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { organisationItems } from "@/lib/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserRole, OBSERVER_TEAM, PRESS_TEAM, SECURITY_TEAM, getEffectiveRole, STAFF_ROLES } from "@/lib/roles";

interface OrganisationMobileSidebarProps {
    onClose?: () => void;
}

export function OrganisationMobileSidebar({ onClose }: OrganisationMobileSidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();

    const actualRole = session?.user?.role;
    const effectiveRole = session?.user ? getEffectiveRole(session.user) : null;
    const status = session?.user?.applicationStatus;
    
    const isStaff = actualRole ? STAFF_ROLES.includes(actualRole) : false;

    const items = organisationItems.filter(item => {
        if (!effectiveRole || !item.roles.includes(effectiveRole)) return false;
        if (!isStaff && status !== 'approved' && item.requiresApproved) return false;
        return true;
    });

    const getTeamLabel = () => {
        if (!effectiveRole) return "Organizasyon";
        if (OBSERVER_TEAM.includes(effectiveRole as UserRole)) return "Gözlemci Ekibi";
        if (PRESS_TEAM.includes(effectiveRole as UserRole)) return "Basın Ekibi";
        if (SECURITY_TEAM.includes(effectiveRole as UserRole)) return "Güvenlik Ekibi";
        return "Organizasyon";
    };

    return (
        <div className="flex flex-col h-full bg-background border-r border-border">
            <div className="p-6 border-b border-border">
                <Link href="/organisation" prefetch={false} className="flex items-center gap-3" onClick={onClose}>
                    <img src="/logo.webp" alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="font-display font-bold text-lg text-primary flex flex-col leading-none">
                        ATAGÇ
                        <span className="text-[10px] font-normal text-muted-foreground mt-1 uppercase tracking-wider">
                            {getTeamLabel()}
                        </span>
                    </span>
                </Link>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Menü
                </div>

                <nav className="space-y-1">
                    {items.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            onClick={onClose}
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
            </ScrollArea>

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