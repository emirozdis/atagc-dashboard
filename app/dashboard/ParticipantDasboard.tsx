"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, CheckCircle2, Clock, Info, MapPin, 
  XCircle, FileQuestion, Users, 
  ChevronRight, AlertTriangle, ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DigitalIdCard } from "@/components/dashboard/DigitalIdCard";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PaymentStatusEnum } from "@/types/payment";
import { ApplicationStatusEnum } from "@/types/application";

import { ParticipantDashboardProps, DashboardData } from "@/types/dashboard";

export function ParticipantDashboard({ user }: ParticipantDashboardProps) {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['participant-me'],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
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

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12 p-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[200px] lg:col-span-2 rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      </div>
    );
  }

  const { application, committeeMember, topic, settings, user: userData } = data || {};
  const paymentStatus = paymentData?.payment_status || PaymentStatusEnum.UNPAID;

  if (!application && userData?.role === 'applicant') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in py-12">
        <div className="w-24 h-24 rounded-full bg-secondary/30 flex items-center justify-center shadow-inner ring-1 ring-white/10">
          <FileQuestion className="w-10 h-10 text-muted-foreground/70" />
        </div>
        <div className="space-y-3 max-w-md mx-auto px-4">
          <h2 className="text-3xl font-bold font-display text-foreground tracking-tight">Başvuru Bulunamadı</h2>
          <p className="text-muted-foreground leading-relaxed">
            Hesabınıza ait aktif bir başvuru kaydı görünmüyor. Eğer başvurunuzu henüz tamamlamadıysanız lütfen ana sayfadan başvuru yapınız.
          </p>
        </div>
      </div>
    );
  }

  const appStatus = application?.status || "pending";
  // Logic: Show ID card if Exempt OR Paid OR Staff
  const isPaymentComplete = paymentStatus === PaymentStatusEnum.PAID || paymentStatus === PaymentStatusEnum.EXEMPT;
  const showIdCard = userData && (userData.role !== 'applicant' || (appStatus === ApplicationStatusEnum.APPROVED && isPaymentComplete));

  const getStatusSteps = () => {
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
                    paymentStatus === PaymentStatusEnum.PAID ? 'done' : 
                    paymentStatus === PaymentStatusEnum.EXEMPT ? 'exempt' :
                    paymentStatus === PaymentStatusEnum.PROCESSING ? 'processing' : 
                    paymentStatus === PaymentStatusEnum.REJECTED ? 'error' : 'pending',
            date: paymentData?.last_receipt?.created_at,
            text: paymentStatus === PaymentStatusEnum.EXEMPT ? "Muaf" : undefined
        },
        {
            id: 'committee',
            label: "Komite",
            status: !committeeMember ? 'waiting' : 'done',
            text: committeeMember?.committee?.name
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
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* ... Header and other parts ... */}
      
      {/* (Skipping Header rendering for brevity, assume same structure as previous) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
            Merhaba, <span className="text-primary">{user?.name?.split(" ")[0]}</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Kayıt sürecinizi buradan takip edebilirsiniz.
          </p>
        </div>
        {settings?.term_name && (
          <Badge variant="outline" className="w-fit px-3 py-1.5 text-xs font-medium uppercase tracking-wider bg-secondary/50">
            {settings.term_name}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={cn("flex flex-col gap-6", showIdCard ? "lg:col-span-2" : "lg:col-span-3")}>
          <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" /> Kayıt Durumu
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                    {steps.map((step, idx) => (
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
                                
                                {step.id === 'payment' && (step.status === 'pending' || step.status === 'error') && (
                                    <Button size="sm" asChild className={cn("h-8 text-xs", step.status === 'error' && "bg-red-600 hover:bg-red-700")}>
                                        <Link href="/dashboard/payment">
                                            {step.status === 'error' ? "Düzelt" : "Öde"} <ChevronRight className="w-3 h-3 ml-1" />
                                        </Link>
                                    </Button>
                                )}
                                {step.id === 'payment' && (step.status === 'processing' || step.status === 'exempt') && (
                                    <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                                        <Link href="/dashboard/payment">Detay</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm flex flex-col flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Etkinlik Detayları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
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
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Digital ID */}
        {showIdCard && userData && (
          <div className="lg:col-span-1 h-full">
            <DigitalIdCard user={userData} className="h-full" uniqueId="dashboard" />
          </div>
        )}
      </div>

      {/* Committee & Topic Section (Approved users) */}
      {appStatus === ApplicationStatusEnum.APPROVED && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50"></div>
            <h3 className="text-lg font-display font-semibold text-muted-foreground uppercase tracking-widest text-sm">Komite ve Çalışma</h3>
            <div className="h-px flex-1 bg-border/50"></div>
          </div>

          {committeeMember ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-card border-border/40 hover:bg-card/50 transition-colors group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2.5 text-lg">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <Users className="w-5 h-5" />
                    </div>
                    Komite Bilgisi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold mb-3 text-foreground">{committeeMember.committee?.name}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {committeeMember.committee?.description || "Açıklama bulunmuyor."}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/40 hover:bg-card/50 transition-colors group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2.5 text-lg">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <FileQuestion className="w-5 h-5" />
                    </div>
                    Çalışma Konusu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topic ? (
                    <>
                      <div className="text-xl font-bold mb-3 text-foreground">{topic.title}</div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {topic.description}
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/60 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                        <Info className="w-5 h-5" />
                      </div>
                      <span className="text-sm">Henüz konu ilan edilmedi.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-secondary/10 border-dashed border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-5 animate-pulse">
                  <Users className="w-7 h-7 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-xl text-foreground mb-2">Komite Ataması Bekleniyor</h4>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Başvurunuz onaylandı, ancak henüz bir komiteye yerleştirilmediniz.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Change Log:
// - Added 'exempt' status handling to the step visualization (purple icon, "Muaf" text).
// - Payment step is marked as 'done' (visually equivalent to done but specific) if exempt.
// - Digital ID card is shown if payment status is 'exempt'.