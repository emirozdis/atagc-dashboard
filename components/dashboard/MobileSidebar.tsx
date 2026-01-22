"use client";

import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { participantItems } from "@/lib/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileSidebarProps {
    onClose?: () => void;
}

export function MobileSidebar({ onClose }: MobileSidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();

    const role = session?.user?.role;
    const status = session?.user?.applicationStatus;
    const type = session?.user?.applicantType || "delegate";

    const roleTag = (() => {
        if (role === 'superadmin' || role === 'admin') return "Yönetim";
        if (role === 'committee_chairman' || role === 'deputy_chair') return "Akademi";
        return null;
    })();

    // Filter items
    const items = participantItems.filter((item) => {
        if (item.roles && role && !item.roles.includes(role)) return false;
        if (role === 'applicant' && status !== 'approved' && item.requiresApproved) return false;
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-background border-r border-border">
            <div className="p-6 border-b border-border">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
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

            <ScrollArea className="flex-1 p-4">
                <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Menü
                </div>

                <nav className="space-y-1">
                    {items.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
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

// Change Log:
// - Added logic to filter mobile sidebar items based on `applicantType`.