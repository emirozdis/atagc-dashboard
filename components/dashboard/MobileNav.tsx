"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { participantItems } from "@/lib/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ConnectionState } from "@/types/connection";

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role;
  const status = session?.user?.applicationStatus;
  const type = session?.user?.applicantType || "delegate";

  // Filter items
  const items = participantItems
    .filter(item => item.mobileCore)
    .filter(item => {
      // Role check
      if (item.roles && role && !item.roles.includes(role)) return false;
      // Approval check
      if (role === 'applicant' && status !== 'approved' && item.requiresApproved) return false;

      return true;
    });

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
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-lg z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const isConnections = item.href === "/dashboard/connections";

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
                {isConnections && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-destructive ring-2 ring-background" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Change Log:
// - Added logic to filter mobile navigation items based on `applicantType`.