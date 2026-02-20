"use client";

import Link from "next/link";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, Mail, MapPin, Phone, GraduationCap, Building2,
  Lock, Laptop, Smartphone, LogOut, Globe, EyeOff, Shield,
  User as UserIcon, Calendar,
  QrCode, UserPlus, Bell, AlertTriangle, FileText, School
} from "lucide-react";
import { ProfileData } from "@/types/dashboard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { DigitalIdCard } from "@/components/dashboard/DigitalIdCard";
import { GRADE_OPTIONS } from "@/lib/constants";

interface DeviceSession {
  id: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  deviceInfo: {
    browser: string;
    os: string;
    type: string;
  };
}

interface NotificationPrefs {
  application: boolean;
  committee: boolean;
  social: boolean;
  system: boolean;
}

export function ProfileView() {
  const queryClient = useQueryClient();
  const [resetLoading, setResetLoading] = useState(false);
  const [digitalIdOpen, setDigitalIdOpen] = useState(false);
  const personalInfoRef = useRef<HTMLDivElement>(null);
  const digitalIdRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const devicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === "personal" && personalInfoRef.current) {
        setTimeout(() => {
          personalInfoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else if (hash === "digital-id" && digitalIdRef.current) {
        setTimeout(() => {
          digitalIdRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          setDigitalIdOpen(true);
        }, 100);
      } else if (hash === "security" && securityRef.current) {
        setTimeout(() => {
          securityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else if (hash === "devices" && devicesRef.current) {
        setTimeout(() => {
          devicesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else if (hash !== "digital-id") {
        setDigitalIdOpen(false);
      }
    };

    handleHashChange();

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const { data: profileData, isLoading } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<DeviceSession[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      const res = await fetch("/api/auth/devices");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    application: true,
    committee: true,
    social: true,
    system: true
  });

  const profile = profileData?.profile;
  const application = profileData?.application;

  useEffect(() => {
    if (profile?.details?.notification_preferences) {
      setPrefs(profile.details.notification_preferences);
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch("/api/participant/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_picture_url: url })
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profil fotoğrafı güncellendi");
    },
    onError: () => toast.error("Hata oluştu.")
  });

  const togglePrivacyMutation = useMutation({
    mutationFn: async (isHidden: boolean) => {
      const res = await fetch("/api/participant/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_profile_picture_hidden: isHidden })
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Gizlilik ayarı güncellendi");
    },
    onError: () => toast.error("Hata oluştu")
  });

  const toggleConnectionPrivacyMutation = useMutation({
    mutationFn: async (allow: boolean) => {
      const res = await fetch("/api/participant/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allow_connections: allow })
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Bağlantı ayarı güncellendi");
    },
    onError: () => toast.error("Hata oluştu")
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (newPrefs: NotificationPrefs) => {
      const res = await fetch("/api/participant/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_preferences: newPrefs })
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Tercihler kaydedildi");
    },
    onError: () => toast.error("Kayıt başarısız")
  });

  const handlePrefChange = (key: keyof NotificationPrefs, val: boolean) => {
    const newPrefs = { ...prefs, [key]: val };
    setPrefs(newPrefs);
    updatePrefsMutation.mutate(newPrefs);
  };

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId?: string) => {
      const params = sessionId ? `id=${sessionId}` : `type=all_others`;
      const res = await fetch(`/api/auth/devices?${params}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success(sessionId ? "Cihazdan çıkış yapıldı" : "Diğer tüm cihazlardan çıkış yapıldı");
    },
    onError: () => toast.error("İşlem başarısız")
  });

  const handleSendResetLink = async () => {
    if (!profile?.email) return;
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email })
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Sıfırlama bağlantısı e-posta adresinize gönderildi.");
    } catch (e) {
      toast.error("İşlem başarısız.");
    } finally {
      setResetLoading(false);
    }
  };

  if (isLoading) return <ProfileSkeleton />;
  if (!profile) return <div className="p-8 text-center text-muted-foreground">Profil verisi yüklenemedi.</div>;

  const details = profile.details;
  const profilePic = details?.profile_picture_url || null;
  const isHidden = details?.is_profile_picture_hidden || false;
  const allowConnections = details?.allow_connections !== false;
  const warnings = profile.user_warnings || [];

  const showIdCard = profile.role !== 'applicant' || application?.status === 'approved';

  const gradeLabel = details?.grade ? GRADE_OPTIONS.find(opt => opt.value === details.grade)?.label : null;

  // Resolve School Name using casting for joined relation and type-safe access for additional_info
  const schoolName = (details as any)?.high_schools?.school_name || 
                     details?.additional_info?.manual_school_name || 
                     "Belirtilmemiş";

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      superadmin: "bg-red-500/10 text-red-600 border-red-500/20",
      admin: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      committee_chairman: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      deputy_chair: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
      press: "bg-pink-500/10 text-pink-600 border-pink-500/20",
      observer: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      delegate: "bg-gray-500/10 text-yellow-600 border-yellow-500/20",
      applicant: "bg-gray-200/10 text-yellow-600 border-yellow-500/20"
    };
    const labels: Record<string, string> = {
      superadmin: "Süper Yönetici",
      admin: "Yönetici",
      committee_chairman: "Komite Başkanı",
      deputy_chair: "Başkan Yardımcısı",
      press: "Basın",
      observer: "Gözlemci",
      delegate: "Delege",
      applicant: "Başvuru Sahibi"
    };
    return <Badge variant="outline" className={cn("px-2.5 py-0.5", styles[role] || styles.applicant)}>{labels[role] || "Kullanıcı"}</Badge>;
  };

  const getDeviceIcon = (os: string, type: string) => {
    const lower = (os + type).toLowerCase();
    if (lower.includes("mobile") || lower.includes("android") || lower.includes("ios")) return <Smartphone className="w-4 h-4" />;
    return <Laptop className="w-4 h-4" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">

      {/* Header Profile Card */}
      <Card className="border-border/50 bg-card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-background" />
        <CardContent className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-10">
            <AvatarUpload
              currentImageUrl={profilePic}
              onUploadComplete={(url) => updateProfileMutation.mutate(url)}
              size="large"
              fallbackText={profile.full_name}
            />
            <div className="flex-1 space-y-1 pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{profile.full_name}</h2>
                {getRoleBadge(profile.role)}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {profile.email}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Katılım: {new Date(profile.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              {application && (
                <Link href="/dashboard/my-application">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 bg-background/50 backdrop-blur-sm">
                    <FileText className="w-3.5 h-3.5" />
                    Başvurum
                  </Button>
                </Link>
              )}
              {isHidden && (
                <div className="flex items-center gap-1.5 text-[10px] bg-secondary/50 text-muted-foreground px-2 py-1 rounded-md border border-border/50">
                  <EyeOff className="w-3 h-3" /> Gizli Profil
                </div>
              )}
              {!allowConnections && (
                <div className="flex items-center gap-1.5 text-[10px] bg-red-500/5 text-red-500 px-2 py-1 rounded-md border border-red-500/20">
                  <UserPlus className="w-3 h-3" /> İstekler Kapalı
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left Column (Details & Security) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card ref={personalInfoRef} className="border-border/50 flex-1">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary" /> Kişisel Bilgiler
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoItem icon={Phone} label="Telefon" value={details?.phone_number} />
              <InfoItem icon={School} label="Okul" value={schoolName} />
              <InfoItem icon={Building2} label="Sınıf" value={gradeLabel || "-"} />
              <InfoItem icon={MapPin} label="Şehir" value={details?.city} />
            </CardContent>
          </Card>

          {/* Warnings Section (Visible only if warnings exist) */}
          {warnings.length > 0 && (
            <Card className="border-border/50 border-l-4 border-l-yellow-500/50">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" /> Disiplin Kaydı
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {warnings.map((w) => (
                  <div key={w.id} className="p-3 bg-secondary/10 border border-border/50 rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 px-1.5 py-0 text-[10px]">
                        Uyarı
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(w.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                      {w.reason}
                    </p>
                    {w.issuer && (
                      <div className="text-[10px] text-muted-foreground text-right pt-1">
                        Yetkili: {w.issuer.full_name}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card ref={securityRef} className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Gizlilik ve Güvenlik
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/50">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-muted-foreground" />
                      Bağlantı İstekleri
                    </div>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Diğer katılımcıların size bağlantı isteği göndermesine izin verin.
                    </p>
                  </div>
                  <Switch
                    checked={allowConnections}
                    onCheckedChange={(val) => toggleConnectionPrivacyMutation.mutate(val)}
                    disabled={toggleConnectionPrivacyMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/50">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                      Profil Fotoğrafı
                    </div>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Fotoğrafınızı diğer katılımcılardan gizleyin.
                    </p>
                  </div>
                  <Switch
                    checked={isHidden}
                    onCheckedChange={(val) => togglePrivacyMutation.mutate(val)}
                    disabled={togglePrivacyMutation.isPending}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border/50">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Şifre Değişikliği</p>
                  <p className="text-xs text-muted-foreground">E-posta adresinize sıfırlama bağlantısı gönderilir.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleSendResetLink} disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Lock className="w-3 h-3 mr-2" />}
                  Bağlantı Gönder
                </Button>
              </div>

              <div ref={devicesRef} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" /> Aktif Oturumlar
                  </h4>
                  {devices.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => revokeSessionMutation.mutate(undefined)}
                      disabled={revokeSessionMutation.isPending}
                    >
                      Diğerlerinden Çıkış Yap
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {devicesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    devices.map(device => (
                      <div key={device.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-1.5 rounded-full", device.isCurrent ? "bg-green-500/10 text-green-600" : "bg-secondary text-muted-foreground")}>
                            {getDeviceIcon(device.deviceInfo.os, device.deviceInfo.type)}
                          </div>
                          <div>
                            <div className="font-medium text-foreground text-xs">
                              {device.deviceInfo.os} • {device.deviceInfo.browser}
                              {device.isCurrent && <span className="ml-2 text-[10px] text-green-600 font-bold bg-green-500/10 px-1.5 py-0.5 rounded">Bu Cihaz</span>}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{device.ip} • Son Aktif: {new Date(device.lastActive).toLocaleDateString()}</div>
                          </div>
                        </div>
                        {!device.isCurrent && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => revokeSessionMutation.mutate(device.id)}>
                            <LogOut className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: E-posta Tercihleri + Digital ID */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> E-posta Bildirimleri
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Başvuru Durumu</span>
                <Switch checked={prefs.application} onCheckedChange={(v) => handlePrefChange('application', v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Komite Duyuruları</span>
                <Switch checked={prefs.committee} onCheckedChange={(v) => handlePrefChange('committee', v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bağlantı İstekleri</span>
                <Switch checked={prefs.social} onCheckedChange={(v) => handlePrefChange('social', v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sistem Uyarıları</span>
                <Switch checked={prefs.system} onCheckedChange={(v) => handlePrefChange('system', v)} />
              </div>
              <p className="text-xs text-muted-foreground pt-3 border-t border-border/50">
                Güvenlik (şifre, hesap) bildirimleri kapatılamaz.
              </p>
            </CardContent>
          </Card>

          {showIdCard && (
            <div ref={digitalIdRef} className="space-y-4">
              <DigitalIdCard
                user={profile}
                uniqueId="profile"
                defaultOpen={digitalIdOpen}
              />

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground leading-relaxed">
                <p className="flex gap-2">
                  <QrCode className="w-4 h-4 text-primary shrink-0" />
                  Bu QR kod etkinlik alanına girişlerde, yoklamalarda ve diğer katılımcılarla bağlantı kurmak için kullanılır.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value?: string | null }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="p-2 bg-secondary/30 rounded-lg text-muted-foreground">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || "-"}</p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}