"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DigitalIdCard } from "@/components/dashboard/DigitalIdCard";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Briefcase,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrganisationPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['participant-me'],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-status-dashboard'],
    queryFn: async () => {
      const res = await fetch("/api/payment/status");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { profile: userProfile } = profile || {};
  const isObserver = userProfile?.role === 'observer';

  const { data: observerInfo, isLoading: observerLoading } = useQuery({
    queryKey: ['observer-info'],
    queryFn: async () => {
      const res = await fetch("/api/observer/info");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isObserver
  });

  const isLoading = profileLoading || paymentLoading || (isObserver && observerLoading);
  const { application } = profile || {};
  const paymentStatus = paymentData?.payment_status || "unpaid";
  const appStatus = application?.status || "pending";

  const isPaymentComplete = paymentStatus === "paid" || paymentStatus === "exempt";
  const showIdCard = userProfile && (userProfile.role !== 'applicant' || (appStatus === "approved" && isPaymentComplete));

  const isAssignedToCommittee = isObserver && observerInfo?.allocatedCommittee;

  const getStatusSteps = () => {
    const assignmentStatus = isObserver
      ? (isAssignedToCommittee ? 'done' : 'waiting')
      : 'waiting';

    const assignmentText = isObserver
      ? (isAssignedToCommittee ? observerInfo?.allocatedCommitteeName || "Atandı" : "Beklemede")
      : "Beklemede";

    return [
      {
        id: 'application',
        label: "Başvuru",
        status: appStatus === 'approved' ? 'done' : appStatus === 'rejected' ? 'error' : 'processing',
        date: application?.submitted_at
      },
      {
        id: 'payment',
        label: "Ödeme",
        status: appStatus !== 'approved' ? 'waiting' :
          paymentStatus === "paid" ? 'done' :
            paymentStatus === "exempt" ? 'exempt' :
              paymentStatus === "processing" ? 'processing' :
                paymentStatus === "rejected" ? 'error' : 'pending',
        date: paymentData?.last_receipt?.created_at,
        text: paymentStatus === "exempt" ? "Muaf" : undefined
      },
      {
        id: 'assignment',
        label: "Atama",
        status: assignmentStatus,
        text: assignmentText
      }
    ];
  };

  const steps = getStatusSteps();

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'exempt': return <ShieldCheck className="w-5 h-5 text-purple-500" />;
      case 'processing': return <Clock className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'pending': return <AlertTriangle className="w-5 h-5 text-primary" />;
      default: return <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />;
    }
  };

  const formatDateRange = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return "Tarih Belirlenmedi";
    try {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : null;
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

      if (endDate) {
        if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
          return `${startDate.getDate()} - ${endDate.getDate()} ${startDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;
        }
        return `${startDate.toLocaleDateString('tr-TR', options)} - ${endDate.toLocaleDateString('tr-TR', options)}`;
      }
      return startDate.toLocaleDateString('tr-TR', options);
    } catch (e) {
      return "Tarih Formatı Hatalı";
    }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <Breadcrumbs items={[{ label: "Organizasyon" }]} />
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight mt-4">
            Merhaba, <span className="text-primary">{session?.user?.name?.split(" ")[0]}</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Kayıt sürecinizi buradan takip edebilirsiniz.
          </p>
        </div>
        {settingsLoading ? (
          <Skeleton className="h-8 w-32 rounded-full" />
        ) : settings?.term_name && (
          <Badge variant="outline" className="w-fit px-3 py-1.5 text-xs font-medium uppercase tracking-wider bg-secondary/50">
            {settings.term_name}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left/Main Column */}
        <div className={cn("flex flex-col gap-6", (showIdCard || isLoading) ? "lg:col-span-2" : "lg:col-span-3")}>
          {/* Kayıt Durumu */}
          <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Kayıt Durumu
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 md:p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-5 h-5 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))
                ) : (
                  steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center justify-between p-4 md:p-6 transition-colors hover:bg-muted/5">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-1">
                          {getStepIcon(step.status)}
                          {idx < steps.length - 1 && (
                            <div className={cn("w-px h-6 my-1", (step.status === 'done' || step.status === 'exempt') ? "bg-emerald-500/30" : "bg-border")} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm md:text-base">{step.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {step.status === 'done' ? (step.text || "Tamamlandı") :
                              step.status === 'exempt' ? "Muaf (Tamamlandı)" :
                                step.status === 'processing' ? "İnceleniyor" :
                                  step.status === 'error' ? "Sorun Var" :
                                    step.status === 'pending' ? "İşlem Bekliyor" :
                                      "Bekleniyor"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {step.date && (
                          <span className="text-[10px] text-muted-foreground hidden sm:inline-block bg-secondary/30 px-2 py-1 rounded">
                            {new Date(step.date).toLocaleDateString("tr-TR")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Observer Committee Assignment Card */}
          {isObserver && !isLoading && (
            <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
              <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  {isAssignedToCommittee ? (
                    <><Briefcase className="w-4 h-4 text-primary" /> Komite Atamanız</>
                  ) : (
                    <><Eye className="w-4 h-4 text-primary" /> Gözlemci Durumu</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isAssignedToCommittee ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Komiteye atandınız
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {observerInfo?.allocatedCommitteeName}
                          {observerInfo?.allocatedArea && ` — ${observerInfo.allocatedArea}`}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push("/dashboard/committee")}
                      className="w-full"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Komiteye Git
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Henüz bir komiteye atanmadınız
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Atama yapıldığında burada görüntülenecektir. Lütfen bekleyiniz.
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Etkinlik Detayları */}
          <Card className="bg-card border-border/50 shadow-sm flex flex-col flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Etkinlik Detayları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              {settingsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border/50">
                    <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-foreground">Tarih</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateRange(settings?.event_start_date, settings?.event_end_date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border/50">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-foreground">Konum</div>
                      <div className="text-xs text-muted-foreground">
                        {settings?.location || "Konum Belirlenmedi"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Digital ID */}
        <div className="lg:col-span-1 h-full min-h-[400px]">
          {(isLoading || (showIdCard && userProfile)) && (
            <DigitalIdCard
              user={userProfile}
              className="h-full"
              uniqueId="organisation"
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}