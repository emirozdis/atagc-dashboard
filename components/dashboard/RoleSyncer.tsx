"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export function RoleSyncer() {
  const { data: session, update, status } = useSession();
  const isUpdatingRef = useRef(false);
  const [hasUpdated, setHasUpdated] = useState(false);

  // Check auth status regularly (20 seconds)
  const { data: checkResult, error } = useQuery({
    queryKey: ["auth-check-role"],
    queryFn: async () => {
      const res = await fetch("/api/auth/check");
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    // Only run check if we think we are authenticated
    enabled: status === "authenticated",
    refetchInterval: 1000 * 20, 
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true, 
  });

  // Handle immediate logout on 401
  useEffect(() => {
    if (error?.message === "Unauthorized") {
        if (process.env.NODE_ENV === "development") {
          console.log("[RoleSyncer] Session invalid (401), invalidating session...");
        }
        signOut({ redirect: false });
    }
  }, [error]);

  // Handle Role/Status Sync
  useEffect(() => {
    if (!session?.user || !checkResult || isUpdatingRef.current || hasUpdated) return;

    const sessionRole = session.user.role;
    const dbRole = checkResult.role;
    
    const sessionAppStatus = session.user.applicationStatus;
    const dbAppStatus = checkResult.applicationStatus;

    const roleMismatch = sessionRole !== dbRole;
    const statusMismatch = sessionAppStatus !== dbAppStatus;

    if (roleMismatch || statusMismatch) {
      
      isUpdatingRef.current = true;

      update()
        .then((newSession) => {
          if (newSession?.user?.role === dbRole) {
             toast.success("Account permissions updated.");
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
