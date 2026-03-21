"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Key, ArrowLeft, Eye, EyeOff } from "lucide-react";
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
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isDev = process.env.NODE_ENV === "development";
    const effectiveToken = turnstileToken || (isDev ? "DEV_BYPASS" : "");

    if (!effectiveToken) {
      toast.error("Lütfen doğrulamayı tamamlayın.");
      return;
    }

    if (step === "otp" && otp.length < 6) {
      toast.error("Lütfen geçerli bir doğrulama kodu giriniz.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
        token: effectiveToken,
        otp: step === "otp" ? otp : "",
      });

      if (result?.error) {
        if (result.error === "2FA_REQUIRED") {
            setStep("otp");
            toast.success("Doğrulama Kodu Gönderildi", { description: "Lütfen e-posta adresinizi kontrol edin." });
            setTurnstileToken("");
            setTurnstileKey(prev => prev + 1);
            setLoading(false);
            return;
        }

        let errorMessage = result.error;
        if (result.error === "CredentialsSignin") errorMessage = "E-posta veya şifre hatalı.";
        if (result.error === "INVALID_OTP") errorMessage = "Girdiğiniz doğrulama kodu hatalı veya süresi dolmuş.";
        
        toast.error("Giriş Başarısız", {
          description: errorMessage,
        });
        
        if (result.error !== "INVALID_OTP") {
            setStep("credentials");
            setOtp("");
        }

        setTurnstileToken("");
        setTurnstileKey(prev => prev + 1);
        setLoading(false);
      } else {
        toast.success("Giriş Başarılı", {
          description: "Yönlendiriliyorsunuz...",
        });

        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user?.role === "superadmin" || session?.user?.role === "admin") {
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
      setTurnstileToken("");
      setTurnstileKey(prev => prev + 1);
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
            {step === "credentials" ? "Lütfen hesabınıza giriş yapın" : "İki Aşamalı Doğrulama"}
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-md p-8 rounded-2xl border border-border/50 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {step === "credentials" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@mail.com"
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
                      Şifremi Unuttum / Yardım
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-9 pr-10"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="py-2 flex justify-center sm:justify-start">
                  <Turnstile 
                    key={`turnstile-login-${turnstileKey}`}
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Giriş Yap"
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center p-4 bg-secondary/20 rounded-xl border border-border/50 text-sm text-muted-foreground mb-4">
                      <strong className="text-foreground block mb-1">{formData.email}</strong>
                      adresine gönderilen 6 haneli kodu giriniz.
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="otp">Doğrulama Kodu</Label>
                      <div className="relative">
                          <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                              id="otp"
                              type="text"
                              maxLength={6}
                              placeholder="000000"
                              className="pl-9 text-center tracking-widest font-mono text-lg"
                              required
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                          />
                      </div>
                  </div>
                  
                  <div className="py-2 flex justify-center sm:justify-start">
                    <Turnstile 
                      key={`turnstile-otp-${turnstileKey}`}
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                      onVerify={(token) => setTurnstileToken(token)}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                      <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1" 
                          disabled={loading}
                          onClick={() => { 
                            setStep("credentials"); 
                            setOtp(""); 
                            setTurnstileToken(""); 
                            setTurnstileKey(k => k + 1); 
                          }}
                      >
                          <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading || otp.length < 6}>
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Doğrula"}
                      </Button>
                  </div>
              </div>
            )}
            
          </form>

          {step === "credentials" && (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Hesabınız yok mu? </span>
              <Link 
                href="/" 
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Başvuru Yap
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}