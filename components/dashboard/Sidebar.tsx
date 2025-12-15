"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Briefcase,
  PenTool,
  User,
  LogOut,
  QrCode,
  ScanLine
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

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
    roles: ["applicant", "committee_chairman", "superadmin"]
  },
  {
    title: "Ortak Çalışma",
    href: "/dashboard/editor",
    icon: PenTool,
    roles: ["applicant", "committee_chairman", "superadmin"]
  },
  {
    title: "Yoklama Oluştur",
    href: "/dashboard/committee/roll-call",
    icon: QrCode,
    roles: ["committee_chairman"]
  },
  {
    title: "Yoklama Ver",
    href: "/dashboard/scan",
    icon: ScanLine,
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
  className?: string;
  onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const items = participantItems.filter(item => !item.roles || (role && item.roles.includes(role)));

  return (
    <div className={cn("flex flex-col h-full bg-[#181818] border-r border-white/5 w-64", className)}>
      <div className="p-6 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <img src="/logo.webp" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-lg text-primary">
            ATAGÇ
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
// - Added `className` and `onClose` props to support rendering inside Mobile Sheet.
// - Attached `onClick={onClose}` to links so the menu closes on navigation.