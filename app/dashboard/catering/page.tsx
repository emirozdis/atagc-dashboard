"use client";

import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DigitalIdCard } from "@/components/dashboard/DigitalIdCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileData } from "@/types/dashboard";

export default function CateringPage() {
  const { data: profileData, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: cateringStatus, isLoading: statusLoading } = useQuery<boolean[]>({
    queryKey: ["catering-status"],
    queryFn: async () => {
      const res = await fetch("/api/catering/status");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const profile = profileData?.profile;

  const userForDigitalId = profile ? {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    created_at: profile.created_at
  } : undefined;

  const days = [
    { label: "Gün 1", day: 1 },
    { label: "Gün 2", day: 2 },
    { label: "Gün 3", day: 3 },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Yemek" }]} />
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Yemek</h2>
        <p className="text-muted-foreground mt-1">
          Etkinlik süresince sunulacak yemek ve ikram bilgileri.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Digital ID Card */}
        <DigitalIdCard
          user={userForDigitalId}
          isLoading={profileLoading}
        />

        {/* Catering Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Yemek Durumu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : (
              days.map((day, index) => {
                const isActive = cateringStatus?.[index] ?? false;
                return (
                  <div
                    key={day.day}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      isActive
                        ? "border-emerald-500/20 bg-emerald-500/10"
                        : "border-border bg-muted/50"
                    )}
                  >
                    <span className="font-medium text-foreground">{day.label}</span>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <>
                          <Check className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-600">Aktif</span>
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Pasif</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}