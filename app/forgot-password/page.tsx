"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, ShieldQuestion, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed");

      setSubmitted(true);
      toast.success("E-posta Gönderildi");
    } catch (e) {
      toast.error("İşlem başarısız oldu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Decoration */}
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-card border border-border/50 p-8 rounded-2xl shadow-xl">
        <div className="mb-6">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Giriş'e Dön
          </Link>
        </div>

        <Tabs defaultValue="reset" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="reset">Şifre Sıfırla</TabsTrigger>
            <TabsTrigger value="help">E-posta Sorunu</TabsTrigger>
          </TabsList>

          <TabsContent value="reset" className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl font-bold">Şifremi Unuttum</h1>
              <p className="text-muted-foreground text-sm mt-2">
                Kayıtlı e-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
              </p>
            </div>

            {submitted ? (
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600">
                <p>Sıfırlama bağlantısı <strong>{email}</strong> adresine gönderildi.</p>
                <p className="text-xs mt-2 opacity-80">Lütfen spam kutunuzu kontrol etmeyi unutmayın.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta Adresi</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Bağlantı Gönder"}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="help" className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
                <ShieldQuestion className="w-8 h-8 text-orange-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">E-posta hesabınıza erişemiyor musunuz?</h2>
                <p className="text-muted-foreground text-sm">
                  E-posta adresinize erişiminizi kaybettiyseniz veya 2 adımlı doğrulama kodunu alamıyorsanız manuel işlem gerekmektedir.
                </p>
              </div>

              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 text-sm space-y-3 w-full">
                <p className="text-foreground/90 leading-relaxed">
                  Hesabınızı kurtarmak için lütfen organizasyon ekibi ile iletişime geçiniz. Kimlik doğrulamasının ardından erişiminiz sağlanacaktır.
                </p>
                
                <Button asChild variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary/5">
                  <a href="mailto:info@atagc.com.tr?subject=Hesap Erişim Sorunu&body=Merhaba, hesabıma erişimi kaybettim. Yardımcı olabilir misiniz?">
                    <Mail className="w-4 h-4 mr-2" />
                    info@atagc.com.tr
                  </a>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground/60">
                Güvenlik nedeniyle hesap kurtarma işlemleri sadece e-posta veya doğrudan iletişim yoluyla yapılmaktadır.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}