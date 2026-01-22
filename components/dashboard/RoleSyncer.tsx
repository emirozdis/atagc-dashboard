"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export function RoleSyncer() {
  const { data: session, update } = useSession();
  const isUpdatingRef = useRef(false);
  const [hasUpdated, setHasUpdated] = useState(false);

  // Use the new lightweight endpoint for polling
  const { data: checkResult } = useQuery({
    queryKey: ["auth-check-role"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    // Polling optimization: Check every 2 minutes instead of 15 seconds.
    // Role changes are rare events.
    refetchInterval: 1000 * 60 * 2, 
    staleTime: 0,
    retry: false,
    // Important: Check immediately when user returns to tab
    refetchOnWindowFocus: true, 
  });

  useEffect(() => {
    if (!session?.user || !checkResult || isUpdatingRef.current || hasUpdated) return;

    const sessionRole = session.user.role;
    const dbRole = checkResult.role;
    
    const sessionAppStatus = session.user.applicationStatus;
    const dbAppStatus = checkResult.applicationStatus;

    const roleMismatch = sessionRole !== dbRole;
    const statusMismatch = sessionAppStatus !== dbAppStatus;

    if (roleMismatch || statusMismatch) {
      console.log(`[RoleSyncer] Syncing... Session: ${sessionRole}/${sessionAppStatus}, DB: ${dbRole}/${dbAppStatus}`);
      
      isUpdatingRef.current = true;

      update()
        .then((newSession) => {
          if (newSession?.user?.role === dbRole) {
             toast.success("Hesap yetkileri güncellendi.");
             setHasUpdated(true);
             setTimeout(() => window.location.reload(), 1000);
          } else {
             isUpdatingRef.current = false;
          }
        })
        .catch(err => {
          console.error("[RoleSyncer] Update failed:", err);
          isUpdatingRef.current = false;
        });
    }
  }, [session, checkResult, update, hasUpdated]);

  return null;
}

// Change Log:
// - Switched from fetching `/api/participant/me` to lightweight `/api/auth/check`.
// - Increased poll interval from 15s to 2 minutes.
// - Enabled `refetchOnWindowFocus` to catch updates when tab becomes active.