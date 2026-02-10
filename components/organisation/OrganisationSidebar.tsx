"use client";

import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { organisationItems } from "@/lib/navigation";

interface OrganisationSidebarProps {
  className?: string;
  onClose?: () => void;
}

export function OrganisationSidebar({ className, onClose }: OrganisationSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role;
  const status = session?.user?.applicationStatus;

  // Filter items based on role
  const items = organisationItems.filter(item => {
    // 1. Role Check
    if (item.roles && role && !item.roles.includes(role)) return false;

    // 2. Approval Check
    if (status !== 'approved' && item.requiresApproved) return false;

    return true;
  });

  return (
    <div className={cn("flex flex-col h-full bg-sidebar border-r border-border w-64", className)}>
      <div className="p-6 border-b border-border">
        <Link href="/organisation" className="flex items-center gap-3" onClick={onClose}>
          <img src="/logo.webp" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-lg text-primary">
            ATAGÇ
            <span className="text-xs ml-2 bg-primary/20 px-1.5 py-0.5 rounded text-primary-foreground">
              Organizasyon
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Organizasyon Menüsü
        </div>

        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
              pathname === item.href
                ? "bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/20"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground border border-transparent"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4" />
              {item.title}
            </div>
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
