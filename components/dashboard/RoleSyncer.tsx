"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export function RoleSyncer() {
  const { data: session, update } = useSession();
  const isUpdatingRef = useRef(false);
  const [hasUpdated, setHasUpdated] = useState(false);

  // Fetch the latest user data from the server
  const { data: profile } = useQuery({
    queryKey: ["participant-me-role-check"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000, // Check periodically
    staleTime: 0, // Ensure fresh data
    retry: false,
  });

  useEffect(() => {
    // Basic checks
    if (!session?.user || !profile?.user || isUpdatingRef.current || hasUpdated) return;

    const sessionRole = session.user.role;
    const dbRole = profile.user.role;
    
    // Also check application status sync
    // If DB has an application status but session doesn't match (e.g. approved vs pending)
    const sessionAppStatus = session.user.applicationStatus;
    const dbAppStatus = profile.application?.status || (['superadmin','admin','committee_chairman','deputy_chair'].includes(dbRole) ? 'approved' : 'pending');

    const roleMismatch = sessionRole !== dbRole;
    const statusMismatch = sessionAppStatus !== dbAppStatus;

    if (roleMismatch || statusMismatch) {
      console.log(`[RoleSyncer] Mismatch detected. Session: ${sessionRole}/${sessionAppStatus}, DB: ${dbRole}/${dbAppStatus}. Syncing...`);
      
      isUpdatingRef.current = true;

      // Trigger NextAuth session update
      update()
        .then((newSession) => {
          // Check if update was successful in reflected session
          if (newSession?.user?.role === dbRole) {
             toast.success("Hesap yetkileri güncellendi.", {
               description: "Yeni rolleriniz ve izinleriniz aktif edildi."
             });
             setHasUpdated(true);
             
             // Soft reload to refresh UI components (like Sidebar) that depend on session
             // Using timeout to allow toast to be seen briefly/prevent jar
             setTimeout(() => {
                 window.location.reload();
             }, 1000);
          } else {
             // If update returned but role didn't change, prevent loop by not reloading immediately
             // but maybe the cookie needs a hard refresh.
             console.warn("[RoleSyncer] Update called but session role did not change.");
             isUpdatingRef.current = false; // Allow retry on next interval if needed
          }
        })
        .catch(err => {
          console.error("[RoleSyncer] Update failed:", err);
          isUpdatingRef.current = false;
        });
    }
  }, [session, profile, update, hasUpdated]);

  return null;
}

// Change Log:
// - Added `isUpdatingRef` to prevent multiple simultaneous update calls.
// - Added `statusMismatch` check to sync application status (pending/approved) alongside roles.
// - Added check on `newSession` returned from `update()` to verify if sync worked before reloading.
// - Removed immediate reload loop risk by checking `hasUpdated` state.