"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SettingsPage() {
  const handleSave = () => {
    toast.success("Ayarlar Kaydedildi");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Ayarlar</h2>
        <p className="text-muted-foreground mt-1">
          Genel sistem ayarları.
        </p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Genel Ayarlar</CardTitle>
          <CardDescription>Sistem genelini etkileyen yapılandırmalar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Başvuruları Kapat</Label>
              <p className="text-sm text-muted-foreground">
                Yeni delegasyon başvurusu alımını durdurur.
              </p>
            </div>
            <Switch />
          </div>
          
          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <div className="space-y-0.5">
              <Label className="text-base">Bakım Modu</Label>
              <p className="text-sm text-muted-foreground">
                Sistemi sadece yöneticiler için erişilebilir yapar.
              </p>
            </div>
            <Switch />
          </div>

          <div className="border-t border-border/50 pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Dönem Adı</Label>
              <Input defaultValue="ATAGÇ 2026" />
            </div>
            <div className="space-y-2">
              <Label>İletişim E-postası</Label>
              <Input defaultValue="info@atagc.com.tr" type="email" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave}>Değişiklikleri Kaydet</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}