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
  User,
  Megaphone,
  Briefcase,
  RefreshCw,
  PenTool,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

const adminItems = [
  {
    title: "Panel",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Başvurular",
    href: "/admin/applications",
    icon: FileText,
  },
  {
    title: "Kullanıcılar",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Komiteler",
    href: "/admin/committees",
    icon: CalendarDays,
  },
  {
    title: "Yoklama",
    href: "/admin/roll-call",
    icon: QrCode,
  },
  {
    title: "Ayarlar",
    href: "/admin/settings",
    icon: Settings,
  },
];

const participantItems = [
  {
    title: "Genel Durum",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["applicant", "committee_chairman", "superadmin", "staff", "staffleader"]
  },
  {
    title: "Komitem",
    href: "/dashboard/committee",
    icon: Briefcase,
    // Staff roles usually don't have an academic committee to view
    roles: ["applicant", "committee_chairman", "superadmin"] 
  },
  {
    title: "Ortak Çalışma",
    href: "/dashboard/editor",
    icon: PenTool,
    // Staff roles don't access the academic document editor
    roles: ["applicant", "committee_chairman", "superadmin"] 
  },
  {
    title: "Duyurular",
    href: "/dashboard/announcements",
    icon: Megaphone,
    roles: ["applicant", "committee_chairman", "superadmin", "staff", "staffleader"]
  },
  {
    title: "Profilim",
    href: "/dashboard/profile",
    icon: User,
    roles: ["applicant", "committee_chairman", "superadmin", "staff", "staffleader"]
  },
];

interface SidebarProps {
  isAdminSection?: boolean;
}

export function Sidebar({ isAdminSection = false }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  // Filter items based on role if it's the participant section
  const items = isAdminSection 
    ? adminItems 
    : participantItems.filter(item => !item.roles || (role && item.roles.includes(role)));

  return (
    <div className="flex flex-col h-full bg-[#181818] border-r border-white/5 w-64">
      <div className="p-6 border-b border-white/5">
        <Link href={isAdminSection ? "/admin" : "/dashboard"} className="flex items-center gap-3">
          <img src="/logo.webp" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-lg text-primary">
            ATAGÇ
            {isAdminSection && <span className="text-xs ml-2 bg-primary/20 px-1.5 py-0.5 rounded text-primary-foreground">Yönetim</span>}
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isAdminSection ? "Yönetim Menüsü" : "Katılımcı Menüsü"}
        </div>
        
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/10 border border-transparent"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.title}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-2">
        {/* Switcher Button - Only visible to Superadmin/Admin roles */}
        {(role === "superadmin" || role === "committee_chairman") && (
          <Button
            asChild
            variant="outline"
            className="w-full justify-start text-xs border-dashed border-white/10 hover:bg-white/5 hover:text-primary bg-transparent text-muted-foreground"
          >
            {/* 
              Logic: 
              - If role is 'committee_chairman', they might have a limited admin panel or just chairman tools. 
              - Assuming 'superadmin' is the main one who switches contexts fully.
              - Modifying link based on role could be done here if needed.
            */}
            <Link href={isAdminSection ? "/dashboard" : "/admin"}>
              <RefreshCw className="w-3 h-3 mr-2" />
              {isAdminSection ? "Katılımcı Görünümü" : "Yönetim Paneli"}
            </Link>
          </Button>
        )}

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
// - Updated `Sidebar` to use correct `committee_chairman` spelling (double 'm', double 't', double 'e').
// - Added `roles` property to `participantItems` to filter visibility.
// - Configured "Komitem" and "Ortak Çalışma" to be hidden for `staff` and `staffleader` as they don't have academic committee assignments.
// - Updated role check in the footer button to include `committee_chairman` and `superadmin`.