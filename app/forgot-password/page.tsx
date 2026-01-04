"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Şifremi Unuttum</h1>
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
      </div>
    </div>
  );
}