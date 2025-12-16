"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Mail,
  Phone,
  GraduationCap,
  MapPin,
  Calendar,
  User,
  FileText,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Globe,
  Award,
  MessageSquare,
  BookOpen
} from "lucide-react";
import { Label } from "@/components/ui/label";

import { ProfileData } from "@/types/dashboard";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/participant/me");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <User className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold">Profil Yüklenemedi</h2>
        <p className="text-muted-foreground max-w-md">
          Profil bilgileriniz yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.
        </p>
      </div>
    );
  }

  const { user, userDetails, application, committeeMember, topic } = profile;
  const additionalInfo = userDetails?.additional_info || {};

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Onaylandı
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Reddedildi
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Bekliyor
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Belirtilmemiş";
    try {
      return new Date(dateString).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Profilim</h2>
        <p className="text-muted-foreground mt-1">
          Kişisel bilgileriniz, başvuru durumunuz ve hesap detaylarınız.
        </p>
      </div>

      {/* Profile Header */}
      <Card className="bg-card border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {(user?.full_name || "??").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left space-y-2 flex-1">
              <h3 className="text-2xl font-bold">{user?.full_name}</h3>
              <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Badge variant="outline" className="capitalize">
                  {user?.role || "Kullanıcı"}
                </Badge>
                {application && getStatusBadge(application.status)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Kişisel Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Ad Soyad</Label>
              <div className="text-sm font-medium">{user?.full_name}</div>
            </div>
            <div className="h-px bg-border/50 my-2" />
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-posta
              </Label>
              <div className="text-sm font-medium">{user?.email}</div>
            </div>
            {userDetails?.phone_number && (
              <>
                <div className="h-px bg-border/50 my-2" />
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefon
                  </Label>
                  <div className="text-sm font-medium">{userDetails.phone_number}</div>
                </div>
              </>
            )}
            {userDetails?.birth_date && (
              <>
                <div className="h-px bg-border/50 my-2" />
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Doğum Tarihi
                  </Label>
                  <div className="text-sm font-medium">{formatDate(userDetails.birth_date)}</div>
                </div>
              </>
            )}
            {userDetails?.school_name && (
              <>
                <div className="h-px bg-border/50 my-2" />
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Okul
                  </Label>
                  <div className="text-sm font-medium">{userDetails.school_name}</div>
                </div>
              </>
            )}
            {additionalInfo.city && (
              <>
                <div className="h-px bg-border/50 my-2" />
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Şehir
                  </Label>
                  <div className="text-sm font-medium">{additionalInfo.city}</div>
                </div>
              </>
            )}
            {additionalInfo.grade && (
              <>
                <div className="h-px bg-border/50 my-2" />
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Sınıf
                  </Label>
                  <div className="text-sm font-medium">{additionalInfo.grade}. Sınıf</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Application & Account Info */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Başvuru ve Hesap Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {application ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Başvuru Durumu</Label>
                  <div>{getStatusBadge(application.status)}</div>
                </div>
                <div className="h-px bg-border/50 my-2" />
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Başvuru Tarihi
                  </Label>
                  <div className="text-sm font-medium">{formatDate(application.submitted_at)}</div>
                </div>
                {application.review_notes && (
                  <>
                    <div className="h-px bg-border/50 my-2" />
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Değerlendirme Notları
                      </Label>
                      <div className="text-sm bg-secondary/10 p-3 rounded-lg border border-border/50">
                        {application.review_notes}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                Henüz başvuru yapılmamış.
              </div>
            )}
            <div className="h-px bg-border/50 my-2" />
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Kullanıcı ID</Label>
              <div className="text-xs font-mono text-muted-foreground break-all">{user?.id}</div>
            </div>
            <div className="h-px bg-border/50 my-2" />
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Hesap Oluşturma Tarihi</Label>
              <div className="text-sm font-medium">{formatDate(user?.created_at)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MUN Experience & Preferences */}
      {(additionalInfo.mun_experience ||
        additionalInfo.previous_conferences ||
        additionalInfo.committee_pref_1 ||
        additionalInfo.committee_pref_2 ||
        additionalInfo.delegation_type ||
        additionalInfo.english_level) && (
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                MUN Deneyimi ve Tercihler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {additionalInfo.mun_experience && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">MUN Deneyimi</Label>
                    <div className="text-sm font-medium">{additionalInfo.mun_experience}</div>
                  </div>
                )}
                {additionalInfo.english_level && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      İngilizce Seviyesi
                    </Label>
                    <div className="text-sm font-medium">{additionalInfo.english_level}</div>
                  </div>
                )}
                {additionalInfo.delegation_type && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Delegasyon Tercihi</Label>
                    <div className="text-sm font-medium">{additionalInfo.delegation_type}</div>
                  </div>
                )}
                {additionalInfo.committee_pref_1 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">1. Komite Tercihi</Label>
                    <div className="text-sm font-medium">{additionalInfo.committee_pref_1}</div>
                  </div>
                )}
                {additionalInfo.committee_pref_2 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">2. Komite Tercihi</Label>
                    <div className="text-sm font-medium">{additionalInfo.committee_pref_2}</div>
                  </div>
                )}
              </div>
              {additionalInfo.previous_conferences && (
                <>
                  <div className="h-px bg-border/50 my-2" />
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Önceki Konferanslar</Label>
                    <div className="text-sm font-medium">{additionalInfo.previous_conferences}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

      {/* Motivation & Expectations */}
      {(additionalInfo.reason_for_joining ||
        additionalInfo.expectations ||
        additionalInfo.self_introduction) && (
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Motivasyon ve Beklentiler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {additionalInfo.reason_for_joining && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Katılım Nedeni</Label>
                    <div className="text-sm bg-secondary/10 p-3 rounded-lg border border-border/50 leading-relaxed">
                      {additionalInfo.reason_for_joining}
                    </div>
                  </div>
                  <div className="h-px bg-border/50 my-2" />
                </>
              )}
              {additionalInfo.expectations && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Beklentiler</Label>
                    <div className="text-sm bg-secondary/10 p-3 rounded-lg border border-border/50 leading-relaxed">
                      {additionalInfo.expectations}
                    </div>
                  </div>
                  <div className="h-px bg-border/50 my-2" />
                </>
              )}
              {additionalInfo.self_introduction && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Kendinizi Tanıtın</Label>
                  <div className="text-sm bg-secondary/10 p-3 rounded-lg border border-border/50 leading-relaxed">
                    {additionalInfo.self_introduction}
                  </div>
                </div>
              )}
              {additionalInfo.kvkk_approved !== undefined && (
                <>
                  <div className="h-px bg-border/50 my-2" />
                  <div className="flex items-center gap-2">
                    {additionalInfo.kvkk_approved ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      KVKK Aydınlatma Metni Onayı: {additionalInfo.kvkk_approved ? "Onaylandı" : "Onaylanmadı"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

      {/* Committee Information */}
      {committeeMember && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Komite Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Komite Adı
              </Label>
              <div className="text-sm font-medium">{committeeMember.committee.name}</div>
            </div>
            <div className="h-px bg-border/50 my-2" />
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Komite Açıklaması</Label>
              <div className="text-sm bg-secondary/10 p-3 rounded-lg border border-border/50">
                {committeeMember.committee.description}
              </div>
            </div>
            <div className="h-px bg-border/50 my-2" />
            <div className="flex items-center gap-2">
              {committeeMember.can_write ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Yazma yetkiniz bulunmaktadır.</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Yazma yetkiniz kısıtlıdır.</span>
                </>
              )}
            </div>
            {topic && (
              <>
                <div className="h-px bg-border/50 my-2" />
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Çalışma Konusu</Label>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{topic.title}</div>
                    <div className="text-sm text-muted-foreground bg-secondary/10 p-3 rounded-lg border border-border/50">
                      {topic.description}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      <Card className="bg-yellow-500/10 border-yellow-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-500">
              <p className="font-medium mb-1">Bilgilerinizde bir yanlışlık mı var?</p>
              <p>
                Bilgilerinizde bir değişiklik yapmak istiyorsanız lütfen{" "}
                <a href="mailto:info@atagc.com.tr" className="underline font-bold">
                  info@atagc.com.tr
                </a>{" "}
                ile iletişime geçiniz.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
// Change Log:
// - Replaced `bg-card/50` with `bg-card` for consistency.