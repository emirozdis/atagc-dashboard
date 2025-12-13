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
  PenTool, // Added icon for Editor
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

// Update Admin paths to use /admin prefix
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
  },
  {
    title: "Komitem",
    href: "/dashboard/committee",
    icon: Briefcase,
  },
  {
    title: "Ortak Çalışma", // Added Editor link
    href: "/dashboard/editor",
    icon: PenTool,
  },
  {
    title: "Duyurular",
    href: "/dashboard/announcements",
    icon: Megaphone,
  },
  {
    title: "Profilim",
    href: "/dashboard/profile",
    icon: User,
  },
];

interface SidebarProps {
  isAdminSection?: boolean;
}

export function Sidebar({ isAdminSection = false }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  // If we are in the Admin Layout (isAdminSection=true), show Admin Items.
  // Otherwise show Participant items.
  const items = isAdminSection ? adminItems : participantItems;

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
        {/* Switcher Button - Only visible to Admins */}
        {role === "admin" && (
          <Button
            asChild
            variant="outline"
            className="w-full justify-start text-xs border-dashed border-white/10 hover:bg-white/5 hover:text-primary bg-transparent text-muted-foreground"
          >
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
// - Added "Ortak Çalışma" (Collaborative Editor) link to the `participantItems` array.
// - Imported `PenTool` icon from `lucide-react`.