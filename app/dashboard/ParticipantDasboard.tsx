"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, Clock, Info, MapPin, XCircle, FileQuestion, Users} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DigitalIdCard } from "@/components/dashboard/DigitalIdCard";
import { cn } from "@/lib/utils";

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

  // If user is an applicant but has no application record, show "Not Found"
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

  const status = application?.status || "pending";

  const getStatusContent = () => {
    switch (status) {
      case "approved":
        return {
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/20",
          icon: CheckCircle,
          title: "Başvurunuz Onaylandı!",
          description: `${settings?.term_name || "Etkinliğe"} katılımınız kesinleşmiştir.`
        };
      case "rejected":
        return {
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          icon: XCircle,
          title: "Başvurunuz Kabul Edilemedi",
          description: "Maalesef başvurunuz olumlu değerlendirilememiştir."
        };
      case "pending":
      default:
        return {
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/20",
          icon: Clock,
          title: "Değerlendirme Aşamasında",
          description: "Başvurunuz ekibimiz tarafından incelenmektedir."
        };
    }
  };

  const statusContent = getStatusContent();
  const StatusIcon = statusContent.icon;

  // Visibility Logic: Show ID card only if Approved OR User is not an Applicant (e.g. Admin)
  const showIdCard = userData && (userData.role !== 'applicant' || status === 'approved');

  // Format Helper for Date Strings (YYYY-MM-DD)
  const formatDateRange = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return "Tarih Belirlenmedi";
    try {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : null;
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

      if (endDate) {
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "Tarih Belirlenmedi";
        if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
          return `${startDate.getDate()} - ${endDate.getDate()} ${startDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;
        }
        return `${startDate.toLocaleDateString('tr-TR', options)} - ${endDate.toLocaleDateString('tr-TR', options)}`;
      }

      if (isNaN(startDate.getTime())) return "Tarih Belirlenmedi";
      return startDate.toLocaleDateString('tr-TR', options);
    } catch (e) {
      return "Tarih Formatı Hatalı";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
            Merhaba, <span className="text-primary">{user?.name?.split(" ")[0]}</span>
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Başvuru durumunu ve etkinlik detaylarını yönetin.
          </p>
        </div>

        {settings?.term_name && (
          <Badge variant="outline" className="w-fit px-3 py-1.5 text-xs font-medium uppercase tracking-wider bg-secondary/50">
            {settings.term_name}
          </Badge>
        )}
      </div>

      {/* Top Grid: Status, Event Info, Digital ID */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Status & Event */}
        <div className={cn("flex flex-col gap-6", showIdCard ? "lg:col-span-2" : "lg:col-span-3")}>
          <Card className={`border ${statusContent.borderColor} bg-card shadow-sm`}>
            <div className="p-6 flex flex-col sm:flex-row gap-5 items-start">
              <div className={`p-3 rounded-xl ${statusContent.bgColor} shrink-0`}>
                <StatusIcon className={`h-8 w-8 ${statusContent.color}`} />
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-semibold tracking-tight ${statusContent.color}`}>
                    {statusContent.title}
                  </h3>
                  {application && (
                    <Badge variant="secondary" className="font-mono text-[10px] text-muted-foreground/70">
                      {application.id.slice(0, 8)}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {statusContent.description}
                </p>

                {status === "rejected" && application?.review_notes && (
                  <div className="mt-3 p-3 bg-secondary/30 rounded-lg text-sm border border-border/50">
                    <span className="font-medium block mb-1 text-foreground/90">Değerlendirme Notu:</span>
                    <span className="text-muted-foreground">{application.review_notes}</span>
                  </div>
                )}
                {status === "pending" && (
                  <p className="text-xs text-muted-foreground/60 pt-2 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Sonuçlar panel üzerinden ve e-posta ile duyurulacaktır.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Event Info Card */}
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

              <div className="pt-3 border-t border-border/50 mt-auto">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Info className="w-3 h-3" />
                  Detaylı program yakında açıklanacaktır.
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

      {/* Committee & Topic Section */}
      {status === "approved" && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50"></div>
            <h3 className="text-lg font-display font-semibold text-muted-foreground uppercase tracking-widest text-sm">Komite ve Çalışma</h3>
            <div className="h-px flex-1 bg-border/50"></div>
          </div>

          {committeeMember ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Committee Card */}
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

              {/* Topic Card */}
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
                  Bu süreçte ekibimiz en uygun eşleşmeyi sağlamak için çalışmaktadır.
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
// - Added logic to hide Digital ID Card if user is an 'applicant' with 'pending' or 'rejected' status.
// - Adjusted grid column spans to expand the Status/Event column when ID Card is hidden.
// - Handled case where `application` might be null for non-applicant roles (ensuring dashboard still loads for admins/managers).