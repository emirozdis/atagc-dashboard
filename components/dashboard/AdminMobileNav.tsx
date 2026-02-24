"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, User, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminMobileNav() {
  const pathname = usePathname();

  const items = [
    { href: "/admin", icon: LayoutDashboard, label: "Panel" },
    { href: "/admin/applications", icon: FileText, label: "Başvuru" },
    { href: "/admin/users", icon: Users, label: "Üyeler" },
    { href: "/admin/roll-call", icon: QrCode, label: "Yoklama" },
    { href: "/admin/profile", icon: User, label: "Profil" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-lg z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "fill-current/20")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}