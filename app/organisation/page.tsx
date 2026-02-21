"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { OBSERVER_TEAM, PRESS_TEAM, SECURITY_TEAM, UserRole, getEffectiveRole, ROLE_METADATA } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DigitalIdCard } from "@/components/dashboard/DigitalIdCard";
import { cn } from "@/lib/utils";
import {
  Camera, ShieldAlert, Eye, User, MapPin, Calendar,
  CheckCircle2, Clock, Info, ChevronRight, Users,
  XCircle, AlertTriangle, ShieldCheck
} from "lucide-react";
import { PaymentStatusEnum } from "@/types/payment";
import { ApplicationStatusEnum } from "@/types/application";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ProfileData, SystemSettings } from "@/types/dashboard";

export default function OrganisationPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole;
  
  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ['participant-me'],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<SystemSettings>({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { profile: userProfile, application } = profile || {};
  const effectiveRole = getEffectiveRole({ role, applicantType: application?.form?.slug });
  const appStatus = application?.status || "pending";

  // Payment status — press and observer roles have payment flows
  const hasPaymentFlow = OBSERVER_TEAM.includes(effectiveRole) || PRESS_TEAM.includes(effectiveRole);

  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-status-dashboard'],
    queryFn: async () => {
      const res = await fetch("/api/payment/status");
      if (res.status === 403 || res.status === 401) {
        return { payment_status: "unpaid" };
      }
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: hasPaymentFlow,
  });

  // Observer-specific allocation data
  const { data: observerData, isLoading: observerLoading } = useQuery({
    queryKey: ['observer-info'],
    queryFn: async () => {
      const res = await fetch("/api/observer/info");
      if (!res.ok) throw new Error("Failed to fetch observer data");
      return res.json();
    },
    enabled: OBSERVER_TEAM.includes(effectiveRole),
  });

  const isLoading = profileLoading || (hasPaymentFlow && paymentLoading);

  const showIdCard = userProfile && (userProfile.role !== 'applicant' || appStatus === 'approved');

  const isObserver = OBSERVER_TEAM.includes(effectiveRole);
  const isPress = PRESS_TEAM.includes(effectiveRole);
  const isSecurity = SECURITY_TEAM.includes(effectiveRole);

  const teamLabel = isObserver ? "Gözlemci Ekibi"
    : isPress ? "Basın Ekibi"
      : isSecurity ? "Güvenlik Ekibi"
        : "Organizasyon";

  const teamColor = isObserver ? "cyan"
    : isPress ? "pink"
      : isSecurity ? "zinc"
        : "primary";

  const paymentStatus = paymentData?.payment_status || PaymentStatusEnum.UNPAID;

  const appliedRoleSlug = application?.form?.slug;
  const appliedRoleLabel = appliedRoleSlug ? ROLE_METADATA[appliedRoleSlug as UserRole]?.label : "Organizasyon";

  const getStatusSteps = () => {
    const steps: {
      id: string;
      label: string;
      status: string;
      text?: string;
      date?: string;
    }[] = [];

    // Step 1: Account / Role confirmation
    steps.push({
      id: 'account',
      label: "Başvuru Durumu",
      status: userProfile && appStatus === 'approved' ? 'done' : appStatus === 'rejected' ? 'error' : 'processing',
      text: appStatus === 'approved' 
              ? appliedRoleLabel 
              : appStatus === 'rejected' 
                ? `${appliedRoleLabel} Başvurusu Reddedildi`
                : `${appliedRoleLabel} Başvurusu İnceleniyor`,
    });

    // Step 2: Payment
    if (hasPaymentFlow) {
      steps.push({
        id: 'payment',
        label: "Ödeme",
        status:
          appStatus !== 'approved' ? 'waiting' :
          paymentStatus === PaymentStatusEnum.PAID ? 'done' :
            paymentStatus === PaymentStatusEnum.EXEMPT ? 'exempt' :
              paymentStatus === PaymentStatusEnum.PROCESSING ? 'processing' :
                paymentStatus === PaymentStatusEnum.REJECTED ? 'error' : 'pending',
        date: paymentData?.last_receipt?.created_at,
        text: paymentStatus === PaymentStatusEnum.EXEMPT ? "Muaf" : undefined
      });
    }

    // Step 3: Observer allocation
    if (isObserver) {
      const hasAllocation = observerData?.allocatedCommittee || observerData?.allocatedArea;
      steps.push({
        id: 'allocation',
        label: "Gözlemci Ataması",
        status: hasAllocation ? 'done' : 'waiting',
        text: hasAllocation
          ? (observerData?.allocatedCommitteeName || observerData?.allocatedArea || "Atandı")
          : "Atama bekleniyor",
      });
    }

    return steps;
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
    } catch {
      return "Tarih Formatı Hatalı";
    }
  };

  // Ensure Digital ID displays default user role ("BAŞVURU SAHİBİ" if not approved)
  const userForDigitalId = userProfile ? {
      id: userProfile.id,
      full_name: userProfile.full_name,
      role: userProfile.role,
      created_at: userProfile.created_at
  } : undefined;

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <Breadcrumbs items={[{ label: "Organizasyon" }]} />
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight mt-4">
            Merhaba, <span className="text-primary">{session?.user?.name?.split(" ")[0]}</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Organizasyon paneline hoş geldiniz.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settingsLoading ? (
            <Skeleton className="h-8 w-32 rounded-full" />
          ) : settings?.term_name && (
            <Badge variant="outline" className="w-fit px-3 py-1.5 text-xs font-medium uppercase tracking-wider bg-secondary/50">
              {settings.term_name}
            </Badge>
          )}
          <Badge variant="outline" className={cn(
            "w-fit px-3 py-1.5 text-xs font-medium uppercase tracking-wider",
            `bg-${teamColor}-500/10 text-${teamColor}-600 border-${teamColor}-500/20`
          )}>
            {teamLabel}
          </Badge>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={cn("flex flex-col gap-6", (showIdCard || isLoading) ? "lg:col-span-2" : "lg:col-span-3")}>

          {/* Status Steps Card */}
          <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Durum Bilgisi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
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
                            <div className={cn(
                              "w-px h-6 my-1",
                              step.status === 'done' ? "bg-emerald-500/30" : "bg-border"
                            )} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm md:text-base">{step.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {step.text || (
                              step.status === 'done' ? "Tamamlandı" :
                              step.status === 'exempt' ? "Muaf (Tamamlandı)" :
                              step.status === 'processing' ? "İnceleniyor" :
                              step.status === 'error' ? "Sorun Var" :
                              step.status === 'pending' ? "İşlem Bekliyor" :
                              "Bekleniyor"
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {step.date && (
                          <span className="text-[10px] text-muted-foreground hidden sm:inline-block bg-secondary/30 px-2 py-1 rounded">
                            {new Date(step.date).toLocaleDateString("tr-TR")}
                          </span>
                        )}

                        {step.id === 'payment' && (step.status === 'pending' || step.status === 'error') && (
                          <Button size="sm" asChild className={cn("h-8 text-xs", step.status === 'error' && "bg-red-600 hover:bg-red-700")}>
                            <Link href="/payment">
                              {step.status === 'error' ? "Düzelt" : "Öde"} <ChevronRight className="w-3 h-3 ml-1" />
                            </Link>
                          </Button>
                        )}
                        {step.id === 'payment' && (step.status === 'processing' || step.status === 'exempt') && (
                          <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                            <Link href="/payment">Detay</Link>
                          </Button>
                        )}

                        {step.id === 'allocation' && step.status === 'done' && (
                          <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                            <Link href="/organisation/observers/my-tasks">
                              Görevlerim <ChevronRight className="w-3 h-3 ml-1" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Event Details Card */}
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

        {/* Digital ID Card Column */}
        {showIdCard && (
            <div className="lg:col-span-1 h-full min-h-[400px]">
                <DigitalIdCard
                    user={userForDigitalId}
                    className="h-full"
                    uniqueId="organisation"
                    isLoading={isLoading}
                />
            </div>
        )}
      </div>

      {/* Role-Specific Sections */}

      {/* OBSERVER SECTION */}
      {isObserver && appStatus === 'approved' && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <h3 className="text-lg font-display font-semibold text-muted-foreground uppercase tracking-widest text-sm">Gözlemci Bilgileri</h3>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {observerLoading ? (
            <Card className="bg-card border-border/40">
              <CardContent className="p-6">
                <Skeleton className="h-8 w-48 mb-4" />
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          ) : observerData?.allocatedCommittee ? (
            <Card className="bg-card border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-lg">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600">
                    <Users className="w-5 h-5" />
                  </div>
                  Atanan Komite
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xl font-bold mb-3 text-foreground">
                    {observerData.allocatedCommitteeName || observerData.allocatedCommittee}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Komite gözlemcisi olarak atandınız.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : observerData?.allocatedArea ? (
            <Card className="bg-card border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-lg">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  Atanan Alan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xl font-bold mb-3 text-foreground">{observerData.allocatedArea}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Alan gözlemcisi olarak atandınız.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-secondary/10 border-dashed border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-5 animate-pulse">
                  <Eye className="w-7 h-7 text-cyan-500" />
                </div>
                <h4 className="font-semibold text-xl text-foreground mb-2">Atama Bekleniyor</h4>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Gözlemci olarak henüz bir komite veya alana atanmadınız. Atama yapıldığında bilgilendirileceksiniz.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PRESS SECTION */}
      {isPress && appStatus === 'approved' && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <h3 className="text-lg font-display font-semibold text-muted-foreground uppercase tracking-widest text-sm">Basın Modülü</h3>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="group relative overflow-hidden bg-card border-border/50 shadow-sm hover:shadow-md hover:border-pink-500/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-transparent opacity-50 pointer-events-none" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2.5 text-lg">
                  <div className="p-2 rounded-lg bg-pink-500/10 text-pink-600">
                    <Camera className="w-5 h-5" />
                  </div>
                  Basın Galerisi
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fotoğraf ve medya içeriklerini görüntüleyin ve yönetin.
                </p>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/organisation/press/gallery" className="flex items-center gap-2">
                    Galeriye Git <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SECURITY SECTION */}
      {isSecurity && appStatus === 'approved' && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <h3 className="text-lg font-display font-semibold text-muted-foreground uppercase tracking-widest text-sm">Güvenlik Modülü</h3>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="group relative overflow-hidden bg-card border-border/50 shadow-sm hover:shadow-md hover:border-zinc-500/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/5 via-transparent to-transparent opacity-50 pointer-events-none" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2.5 text-lg">
                  <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  QR Tarama
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Katılımcı giriş kartlarını tarayın ve kontrol edin.
                </p>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/organisation/security/scan" className="flex items-center gap-2">
                    Taramaya Başla <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}