"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { organisationItems } from "@/lib/navigation";
import { useSession } from "next-auth/react";

export function OrganisationMobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role;
  const status = session?.user?.applicationStatus;

  // Filter items for mobile navigation
  const items = organisationItems
    .filter(item => item.mobileCore)
    .filter(item => {
      // Role check
      if (item.roles && role && !item.roles.includes(role)) return false;
      // Approval check
      if (status !== 'approved' && item.requiresApproved) return false;

      return true;
    });

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-lg z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-5 h-5", isActive && "fill-current/20")} />
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
