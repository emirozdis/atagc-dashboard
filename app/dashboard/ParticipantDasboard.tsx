import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/SERVER_supabase";
import { Calendar, CheckCircle, Clock, FileText, Info, MapPin, XCircle, Users } from "lucide-react";

interface ParticipantDashboardProps {
  user: any; // Using any for simplicity with the session user object
}

export async function ParticipantDashboard({ user }: ParticipantDashboardProps) {
  // Fetch application status
  const { data: application } = await supabase
    .from("applications")
    .select("status, submitted_at, review_notes")
    .eq("user_id", user.id)
    .single();

  // Fetch committee assignment if exists
  const { data: committeeMember } = await supabase
    .from("committee_members")
    .select(`
      committee:committees (
        name,
        description,
        admin_id
      )
    `)
    .eq("user_id", user.id)
    .single();

  // Fetch assigned topic if committee exists
  let topic = null;
  if (committeeMember?.committee) {
    const { data: topicData } = await supabase
      .from("topics")
      .select("title, description")
      // @ts-ignore
      .eq("committee_id", committeeMember.committee.id) 
      .limit(1)
      .single();
    topic = topicData;
  }

  const status = application?.status || "pending";

  const getStatusCard = () => {
    switch (status) {
      case "approved":
        return (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1">
                <CardTitle className="text-xl text-green-500">Başvurunuz Onaylandı!</CardTitle>
                <CardDescription className="text-green-500/80">
                  ATAGÇ 2026'ya katılımınız kesinleşmiştir.
                </CardDescription>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </CardHeader>
          </Card>
        );
      case "rejected":
        return (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1">
                <CardTitle className="text-xl text-destructive">Başvurunuz Kabul Edilemedi</CardTitle>
                <CardDescription className="text-destructive/80">
                  Maalesef başvurunuz olumlu değerlendirilememiştir.
                </CardDescription>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </CardHeader>
            <CardContent>
              {application?.review_notes && (
                <div className="mt-2 p-3 bg-background/50 rounded-md text-sm border border-destructive/20">
                  <span className="font-semibold block mb-1">Açıklama:</span>
                  <span className="text-muted-foreground">{application.review_notes}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1">
                <CardTitle className="text-xl text-yellow-500">Değerlendirme Aşamasında</CardTitle>
                <CardDescription className="text-yellow-500/80">
                  Başvurunuz ekibimiz tarafından incelenmektedir.
                </CardDescription>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sonuçlar panel üzerinden ve e-posta adresinizden duyurulacaktır.
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">
          Merhaba, {user?.name?.split(" ")[0]}
        </h2>
        <p className="text-muted-foreground mt-1">
          Başvuru durumunu ve etkinlik detaylarını buradan takip edebilirsin.
        </p>
      </div>

      {/* Application Status */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
            {getStatusCard()}
        </div>
        
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Etkinlik Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span>15 - 17 Mayıs 2026</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span>İTÜ GVO İzmir NESAN</span>
            </div>
            <div className="pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                Detaylı program yakında açıklanacaktır.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Committee Info - Only show if approved */}
      {status === "approved" && (
        <div className="space-y-4">
          <h3 className="text-xl font-display font-semibold">Komite Bilgileri</h3>
          
          {committeeMember ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-primary" />
                    Komite
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* @ts-ignore */}
                  <div className="text-xl font-bold mb-2">{committeeMember.committee?.name}</div>
                  {/* @ts-ignore */}
                  <p className="text-sm text-muted-foreground">{committeeMember.committee?.description || "Açıklama bulunmuyor."}</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-primary" />
                    Çalışma Konusu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topic ? (
                    <>
                      <div className="text-lg font-bold mb-2">{topic.title}</div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{topic.description}</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Info className="w-4 h-4" />
                      <span>Henüz konu atanmadı veya ilan edilmedi.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
             <Card className="bg-card/50 border-border/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <h4 className="font-medium text-lg text-foreground">Komite Ataması Bekleniyor</h4>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                      Başvurunuz onaylandı, ancak henüz bir komiteye yerleştirilmediniz. 
                      Komite atamaları yapıldığında buradan görebileceksiniz.
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
// - Corrected filename from `ParticipantDasboard.tsx` to `ParticipantDashboard.tsx`.
// - Ensured `SERVER_supabase` is used for server-side fetching.
// - Render logic for Application Status (Approved, Rejected with notes, Pending).
// - Added Committee/Topic display logic for approved participants.