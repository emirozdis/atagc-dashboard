"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DigitalIdCard } from "@/components/dashboard/DigitalIdCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, UtensilsCrossed, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileData } from "@/types/dashboard";

export default function SharedCateringPage() {
  const { data: session } = useSession();

  const { data: profileData, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: cateringStatus, isLoading: statusLoading } = useQuery<boolean>({
    queryKey: ["catering-status"],
    queryFn: async () => {
      const res = await fetch("/api/catering/status");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const profile = profileData?.profile;
  const appStatus = profileData?.application?.status || "pending";

  const showIdCard = profile && (profile.role !== 'applicant' || appStatus === 'approved');

  const userForDigitalId = profile ? {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    created_at: profile.created_at
  } : undefined;

  const isActive = cateringStatus ?? false;

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
        {showIdCard || profileLoading ? (
            <DigitalIdCard
            user={userForDigitalId}
            isLoading={profileLoading}
            />
        ) : (
            <Card className="border-dashed border-border/60 bg-secondary/10">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">Kimlik Kartı Pasif</h3>
                    <p className="text-muted-foreground text-sm">Başvurunuz henüz onaylanmadığı için dijital kimlik kartınız aktif değildir.</p>
                </CardContent>
            </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5" />
              Bugünün Yemeği
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-14 w-full" />
            ) : (
              <div
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border",
                  isActive
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-border bg-muted/50"
                )}
              >
                <span className="font-medium text-foreground">Bugünün Yemeği</span>
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-600">Alındı</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Alınmadı</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}