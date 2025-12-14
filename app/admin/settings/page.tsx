"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Save, Settings2, ShieldAlert, Mail, Calendar, Power, AlertTriangle } from "lucide-react";

interface SystemSettings {
  applications_open: boolean;
  maintenance_mode: boolean;
  term_name: string;
  contact_email: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    applications_open: true,
    maintenance_mode: false,
    term_name: "ATAGÇ 2026",
    contact_email: "info@atagc.com.tr",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        // Fallback to defaults if api returns null/empty
        setSettings(data || {
          applications_open: true,
          maintenance_mode: false,
          term_name: "ATAGÇ 2026",
          contact_email: "info@atagc.com.tr",
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
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Settings2 className="w-8 h-8 text-primary" />
          Sistem Ayarları
        </h2>
        <p className="text-muted-foreground mt-1">
          Genel sistem yapılandırması ve erişim kontrolleri.
        </p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
            <CardTitle>Genel Bilgiler</CardTitle>
            <CardDescription>Kurum ve etkinlik temel bilgileri.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Dönem Adı
                </Label>
                <Input
                  value={settings.term_name}
                  onChange={(e) => setSettings({ ...settings, term_name: e.target.value })}
                  placeholder="Örn: ATAGÇ 2026"
                  className="bg-secondary/10"
                />
                <p className="text-xs text-muted-foreground">Panel başlıklarında ve e-postalarda görünür.</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  İletişim E-postası
                </Label>
                <Input
                  value={settings.contact_email}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                  placeholder="info@atagc.com.tr"
                  type="email"
                  className="bg-secondary/10"
                />
                <p className="text-xs text-muted-foreground">Kullanıcıların destek için göreceği adres.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Control */}
        <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Erişim Kontrolü</CardTitle>
                <CardDescription>Başvuru ve sistem erişim durumu.</CardDescription>
              </div>
              <ShieldAlert className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium cursor-pointer" htmlFor="apps-switch">Başvuruları Kapat</Label>
                  {!settings.applications_open && <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">KAPALI</span>}
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  Aktif edildiğinde yeni delegasyon başvurusu alınmayacaktır. Mevcut başvurular etkilenmez.
                </p>
              </div>
              <Switch
                id="apps-switch"
                checked={!settings.applications_open}
                onCheckedChange={(checked) => setSettings({ ...settings, applications_open: !checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <Label className="text-base font-medium text-red-500 cursor-pointer" htmlFor="maintenance-switch">Bakım Modu</Label>
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  Sistemi <span className="font-semibold text-foreground">sadece yöneticiler</span> için erişilebilir yapar. Katılımcılar giriş yapamaz.
                </p>
              </div>
              <Switch
                id="maintenance-switch"
                className="data-[state=checked]:bg-red-500"
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
              />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 p-4 border-t border-border/50 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Değişiklikleri Kaydet
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Change Log:
// - Added full fetching and saving logic connected to API.
// - Enhanced UI with Icons, Card styling, and better typography.
// - Added proper loading states and toast notifications.
// - Split settings into logical sections (General, Access Control).