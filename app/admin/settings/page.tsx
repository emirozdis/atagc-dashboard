"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Loader2, 
  Save, 
  Settings2, 
  ShieldAlert, 
  Mail, 
  Calendar, 
  AlertTriangle, 
  MapPin,
  Building,
  Globe,
  Clock,
  Lock
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SystemSettings {
  applications_open: boolean;
  maintenance_mode: boolean;
  term_name: string;
  contact_email: string;
  location: string;
  event_start_date: string | null;
  event_end_date: string | null;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    applications_open: true,
    maintenance_mode: false,
    term_name: "",
    contact_email: "",
    location: "",
    event_start_date: "",
    event_end_date: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
            applications_open: data.applications_open ?? true,
            maintenance_mode: data.maintenance_mode ?? false,
            term_name: data.term_name || "",
            contact_email: data.contact_email || "",
            location: data.location || "",
            // Handle date string directly to avoid timezone offsets
            event_start_date: data.event_start_date ? data.event_start_date.split('T')[0] : "",
            event_end_date: data.event_end_date ? data.event_end_date.split('T')[0] : ""
        });
      }
    } catch (e) {
      toast.error("Ayarlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Save failed");

      toast.success("Ayarlar başarıyla kaydedildi", {
        description: "Sistem değişiklikleri anında uygulandı."
      });
      // Refresh to ensure we have the clean state
      fetchSettings();
    } catch (error) {
      toast.error("Hata", { description: "Değişiklikler kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-primary" />
            Sistem Ayarları
          </h2>
          <p className="text-muted-foreground mt-1 text-lg">
            Platform genel yapılandırması ve erişim kontrolleri.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg shadow-primary/20">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Değişiklikleri Kaydet
        </Button>
      </div>

      <div className="grid gap-8">
        
        {/* Identity & Contact Section */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold tracking-wide uppercase text-xs">
                <Globe className="w-4 h-4" /> Genel Bilgiler
            </div>
            <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/5 pb-4 border-b border-border/50">
                <CardTitle className="text-xl">Kurumsal Kimlik</CardTitle>
                <CardDescription>Etkinlik adı, iletişim bilgileri ve temel tanımlar.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-medium">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        Dönem / Etkinlik Adı
                    </Label>
                    <Input
                        value={settings.term_name}
                        onChange={(e) => setSettings({ ...settings, term_name: e.target.value })}
                        placeholder="Örn: ATAGÇ 2026"
                        className="bg-background/50 h-11 text-lg"
                    />
                    <p className="text-[13px] text-muted-foreground">Panel başlıklarında, e-postalarda ve sayfa başlıklarında görünür.</p>
                </div>

                <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-medium">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        İletişim E-postası
                    </Label>
                    <Input
                        value={settings.contact_email}
                        onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                        placeholder="info@atagc.com.tr"
                        type="email"
                        className="bg-background/50 h-11"
                    />
                    <p className="text-[13px] text-muted-foreground">Kullanıcıların destek için göreceği resmi e-posta adresi.</p>
                </div>
                </div>
            </CardContent>
            </Card>
        </section>

        {/* Event Details Section */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold tracking-wide uppercase text-xs">
                <Calendar className="w-4 h-4" /> Etkinlik Detayları
            </div>
            <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/5 pb-4 border-b border-border/50">
                    <CardTitle className="text-xl">Zaman ve Mekan</CardTitle>
                    <CardDescription>Etkinliğin gerçekleşeceği yer ve tarihler.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-base font-medium">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            Konum / Yerleşke
                        </Label>
                        <Input
                            value={settings.location}
                            onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                            placeholder="Örn: İTÜ GVO İzmir NESAN Yerleşkesi"
                            className="bg-background/50 h-11"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-base font-medium">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                Başlangıç Tarihi
                            </Label>
                            <Input
                                type="date"
                                value={settings.event_start_date || ""}
                                onChange={(e) => setSettings({ ...settings, event_start_date: e.target.value })}
                                className="bg-background/50 h-11 w-full block"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-base font-medium">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                Bitiş Tarihi
                            </Label>
                            <Input
                                type="date"
                                value={settings.event_end_date || ""}
                                onChange={(e) => setSettings({ ...settings, event_end_date: e.target.value })}
                                className="bg-background/50 h-11 w-full block"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>

        {/* Security & Access Section */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold tracking-wide uppercase text-xs">
                <ShieldAlert className="w-4 h-4" /> Güvenlik ve Erişim
            </div>
            <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/5 pb-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-xl">Erişim Kontrolü</CardTitle>
                    <CardDescription>Sistemin genel erişilebilirlik durumu.</CardDescription>
                </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex flex-col divide-y divide-border/50">
                    
                    {/* Application Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 hover:bg-muted/5 transition-colors">
                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-3">
                                <Label className="text-base font-semibold cursor-pointer" htmlFor="apps-switch">Başvuru Alımı</Label>
                                {settings.applications_open ? (
                                    <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">AÇIK</span>
                                ) : (
                                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">KAPALI</span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                                Bu ayar kapatıldığında, yeni kullanıcılar sisteme kayıt olamaz ve başvuru formu gönderemez. Mevcut kullanıcılar sistemden etkilenmez.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{settings.applications_open ? "Açık" : "Kapalı"}</span>
                            <Switch
                                id="apps-switch"
                                checked={settings.applications_open}
                                onCheckedChange={(checked) => setSettings({ ...settings, applications_open: checked })}
                            />
                        </div>
                    </div>

                    {/* Maintenance Mode */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <Label className="text-base font-semibold text-red-600 cursor-pointer" htmlFor="maintenance-switch">Bakım Modu</Label>
                                {settings.maintenance_mode && <span className="animate-pulse text-[10px] font-bold text-red-600 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">AKTİF</span>}
                            </div>
                            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                                Bakım modu aktif edildiğinde, <span className="font-semibold text-foreground">Yöneticiler (Admin)</span> hariç kimse sisteme giriş yapamaz. Giriş yapmış kullanıcıların oturumu sonlandırılmaz ancak sayfaları yenilediklerinde erişim engellenir.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{settings.maintenance_mode ? "Aktif" : "Pasif"}</span>
                            <Switch
                                id="maintenance-switch"
                                className="data-[state=checked]:bg-red-500"
                                checked={settings.maintenance_mode}
                                onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
            </Card>
        </section>

        {/* Future Features / Brainstorming Area (Visual Only) */}
        <section className="space-y-4 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 text-primary/70 font-semibold tracking-wide uppercase text-xs">
                <Lock className="w-4 h-4" /> Gelecek Özellikler (Planlanan)
            </div>
            <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-muted/10 border-dashed border-border">
                    <CardHeader className="p-4">
                        <CardTitle className="text-base text-muted-foreground">Dosya Yükleme</CardTitle>
                        <CardDescription className="text-xs">Position Paper yüklemeleri</CardDescription>
                    </CardHeader>
                </Card>
                <Card className="bg-muted/10 border-dashed border-border">
                    <CardHeader className="p-4">
                        <CardTitle className="text-base text-muted-foreground">Sertifika Sistemi</CardTitle>
                        <CardDescription className="text-xs">Otomatik QR sertifika</CardDescription>
                    </CardHeader>
                </Card>
                <Card className="bg-muted/10 border-dashed border-border">
                    <CardHeader className="p-4">
                        <CardTitle className="text-base text-muted-foreground">Toplu E-posta</CardTitle>
                        <CardDescription className="text-xs">Duyuru mail servisi</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </section>

      </div>
    </div>
  );
}

// Change Log:
// - Updated `fetchSettings` to parse date strings using `split('T')[0]` instead of creating a Date object and converting to ISO string, which was causing timezone offsets (off-by-one day error).
// - Removed default initialized state values for strings to prevent hydration mismatch with loading state.