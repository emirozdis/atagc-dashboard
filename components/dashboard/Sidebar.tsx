"use client";

import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { participantItems } from "@/lib/navigation";
import { useQuery } from "@tanstack/react-query";
import { ConnectionState } from "@/types/connection";
import { STAFF_ROLES, MANAGEMENT_ROLES, COMMITTEE_LEADS, getEffectiveRole, UserRole } from "@/lib/roles";

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const actualRole = session?.user?.role;
  const effectiveRole = session?.user ? getEffectiveRole(session.user) : null;
  const status = session?.user?.applicationStatus;

  const isStaff = actualRole ? STAFF_ROLES.includes(actualRole) : false;

  const { data: hasDelegation } = useQuery<boolean>({
    queryKey: ['delegation-check'],
    queryFn: async () => {
      const res = await fetch("/api/delegation/list_delegation_members");
      if (!res.ok) return false;
      const json = await res.json();
      return json.has_delegation === true;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!session,
  });

  // Filter items
  const items = participantItems.filter(item => {
    // 1. Role Check using Effective Role
    if (item.roles && effectiveRole && !item.roles.includes(effectiveRole)) return false;

    // 2. Approval Check
    if (!isStaff && status !== 'approved' && item.requiresApproved) return false;

    // 3. Delegation Check
    if (item.requiresDelegation && !hasDelegation) return false;

    return true;
  });

  const roleTag = (() => {
    if (effectiveRole && MANAGEMENT_ROLES.includes(effectiveRole as UserRole)) return "Yönetim";
    if (effectiveRole && COMMITTEE_LEADS.includes(effectiveRole as UserRole)) return "Akademi";
    return null;
  })();

  const shouldPollConnections = !!session && status === 'approved';

  const { data: connectionData } = useQuery<ConnectionState>({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await fetch("/api/connections");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 1000 * 60,
    refetchInterval: 60000,
    enabled: shouldPollConnections
  });

  const pendingCount = connectionData?.pending?.length || 0;

  return (
    <div className={cn("flex flex-col h-full bg-sidebar border-r border-border w-64", className)}>
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

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Katılımcı Menüsü
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

            {item.href === "/connections" && pendingCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
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