"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { Turnstile } from "@/components/ui/turnstile";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turnstileToken) {
      toast.error("Lütfen doğrulamayı tamamlayın.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
        token: turnstileToken, // Pass token to NextAuth
      });

      if (result?.error) {
        const errorMessage = result.error === "CredentialsSignin" 
            ? "E-posta veya şifre hatalı." 
            : result.error;

        toast.error("Giriş Başarısız", {
          description: errorMessage,
        });
        
        // Reset turnstile on failure to force re-verification if needed, 
        // though typically Turnstile handles this. 
        // Ideally we reset the widget, but simple error toast is standard.
        setLoading(false);
      } else {
        toast.success("Giriş Başarılı", {
          description: "Yönlendiriliyorsunuz...",
        });

        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user?.role === "superadmin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch (error) {
      toast.error("Hata", {
        description: "Bir sorun oluştu.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/logo.webp"
            alt="ATAGÇ Logo"
            className="w-20 h-20 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold font-display gold-gradient">
            ATAGÇ
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Lütfen hesabınıza giriş yapın
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-md p-8 rounded-2xl border border-border/50 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@atagc.com.tr"
                  className="pl-9"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifre</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Şifremi unuttum?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="py-2">
              <Turnstile 
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onVerify={(token) => setTurnstileToken(token)}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş Yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Change Log:
// - Added `Turnstile` component to the login form.
// - Added client-side validation to ensure token exists before submitting.
// - Passed `token` to the `signIn` function.