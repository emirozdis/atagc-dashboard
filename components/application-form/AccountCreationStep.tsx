import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AccountCreationData } from "@/types/application";
import { 
  CheckCircle2, 
  Loader2, 
  Mail, 
  ArrowRight, 
  User, 
  RefreshCcw,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Turnstile } from "@/components/ui/turnstile";

interface AccountCreationStepProps {
    form: UseFormReturn<AccountCreationData>;
    isEmailVerified: boolean;
    onVerify: (status: boolean) => void;
    onModeChange: (mode: 'register' | 'login') => void;
    onTokenChange: (token: string) => void;
}

export function AccountCreationStep({ form, isEmailVerified, onVerify, onModeChange, onTokenChange }: AccountCreationStepProps) {
    const { register, formState: { errors }, watch, getValues, trigger, setValue } = form;
    
    // States
    const [stepState, setStepState] = useState<'email' | 'verifying' | 'details' | 'login'>('email');
    const [verificationCode, setVerificationCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailCheckLoading, setEmailCheckLoading] = useState(false);
    const [resumeName, setResumeName] = useState("");
    const [turnstileToken, setTurnstileToken] = useState("");

    const email = watch("email");
    const password = watch("password");

    // Password criteria helpers
    const hasMinLength = password?.length >= 8;
    const hasUpper = /[A-Z]/.test(password || "");
    const hasLower = /[a-z]/.test(password || "");
    const hasNumber = /[0-9]/.test(password || "");

    // Propagate token changes to parent
    useEffect(() => {
        onTokenChange(turnstileToken);
    }, [turnstileToken, onTokenChange]);

    // Clear token when switching steps to ensure fresh validation for next protected action
    useEffect(() => {
        setTurnstileToken("");
    }, [stepState]);

    const handleCheckEmail = async () => {
        const isEmailFormatValid = await trigger("email");
        if (!isEmailFormatValid) return;

        // Require Turnstile token for the initial check to prevent bot spam on user-status/verify endpoints
        if (!turnstileToken) {
            toast.error("Lütfen doğrulamayı tamamlayın.");
            return;
        }

        setEmailCheckLoading(true);
        try {
            const res = await fetch("/api/auth/user-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: getValues("email") }),
            });
            const data = await res.json();

            if (data.status === 'has_application') {
                toast.warning("Başvurunuz Mevcut", { description: "Zaten bir başvurunuz var. Yönlendiriliyorsunuz..." });
                setTimeout(() => window.location.href = '/login', 2000);
            } else if (data.status === 'resume_application') {
                setResumeName(data.user_name);
                setStepState('login');
                onModeChange('login');
                toast.info("Tekrar Hoşgeldiniz", { description: "Kaldığınız yerden devam etmek için giriş yapınız." });
            } else {
                // New User -> Send Code
                await sendVerificationCode();
            }
        } catch (e) {
            toast.error("Bağlantı hatası");
        } finally {
            setEmailCheckLoading(false);
        }
    };

    const sendVerificationCode = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: getValues("email"),
                    token: turnstileToken // Pass token for verification
                }),
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
            }
            
            setStepState('verifying');
            onModeChange('register');
            toast.success("Doğrulama Kodu Gönderildi");
        } catch (e: any) {
            toast.error("Kod gönderilemedi.", { description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (verificationCode.length < 6) return;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/verify", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: getValues("email"), code: verificationCode }),
            });
            
            if (!res.ok) throw new Error("Invalid code");

            onVerify(true);
            setStepState('details');
            toast.success("E-posta Doğrulandı");
        } catch (e) {
            toast.error("Hatalı Kod", { description: "Lütfen kodu kontrol ediniz." });
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setStepState('email');
        onVerify(false);
        setVerificationCode("");
        setValue("password", "");
        setValue("confirmPassword", "");
        setValue("adSoyad", "");
        setTurnstileToken("");
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. Email Input Section */}
            {stepState === 'email' && (
                <div className="space-y-4">
                    <Label htmlFor="email" className="text-base font-medium text-foreground">
                        E-posta Adresi
                    </Label>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    placeholder="ornek@email.com"
                                    {...register("email")}
                                    className="pl-10 h-11 bg-background/50 border-border/50"
                                    onKeyDown={(e) => e.key === 'Enter' && turnstileToken && handleCheckEmail()}
                                />
                            </div>
                            <Button 
                                type="button" 
                                onClick={handleCheckEmail} 
                                disabled={emailCheckLoading || !email || !turnstileToken}
                                className="h-11 px-6 shadow-md"
                            >
                                {emailCheckLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            </Button>
                        </div>
                        
                        {/* Turnstile Widget for Email Step */}
                        <div className="flex justify-center sm:justify-start">
                            <Turnstile 
                                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                                onVerify={setTurnstileToken}
                            />
                        </div>
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
            )}

            {/* Read-Only Email Display for subsequent steps */}
            {stepState !== 'email' && (
                <div className="space-y-4">
                    <Label className="text-base font-medium text-muted-foreground">E-posta Adresi</Label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={email}
                                disabled
                                className="pl-10 h-11 bg-background/50 border-border/50"
                            />
                            <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-500 animate-in zoom-in" />
                        </div>
                        <Button variant="ghost" onClick={resetFlow} className="h-11 px-3 text-muted-foreground hover:text-destructive">
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* 2. Resume / Login Mode */}
            {stepState === 'login' && (
                <div className="p-6 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-4 animate-in slide-in-from-top-4 fade-in">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-full text-blue-600">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground">Hoşgeldin, {resumeName}</h4>
                            <p className="text-xs text-muted-foreground">Başvuruya devam etmek için şifreni gir.</p>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Şifre</Label>
                        <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...register("password")} 
                            className="bg-background"
                        />
                        <div className="flex justify-end">
                            <a href="/forgot-password" target="_blank" className="text-xs text-primary hover:underline">Şifremi Unuttum</a>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Turnstile 
                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                            onVerify={setTurnstileToken}
                        />
                    </div>
                </div>
            )}

            {/* 3. Verification Code Input */}
            {stepState === 'verifying' && (
                <div className="p-6 rounded-xl bg-secondary/10 border border-border/50 space-y-4 animate-in slide-in-from-top-4 fade-in">
                    <div className="text-sm text-muted-foreground text-center">
                        <span className="font-semibold text-foreground">{email}</span> adresine gönderilen 6 haneli kodu giriniz.
                    </div>
                    <div className="flex justify-center gap-2">
                        <Input 
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            className="text-center text-lg tracking-[0.5em] font-mono h-12 w-48 bg-background"
                            maxLength={6}
                            placeholder="000000"
                        />
                        <Button onClick={handleVerifyCode} disabled={loading || verificationCode.length < 6} className="h-12 w-12 p-0">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        </Button>
                    </div>
                    <div className="text-center">
                        <button onClick={sendVerificationCode} disabled={loading} className="text-xs text-muted-foreground hover:text-primary underline">
                            Kodu Tekrar Gönder
                        </button>
                    </div>
                </div>
            )}

            {/* 4. Registration Details (Password & Name) */}
            {stepState === 'details' && (
                <div className="space-y-6 animate-in slide-in-from-top-4 fade-in">
                    <div className="space-y-2">
                        <Label>Ad Soyad <span className="text-destructive">*</span></Label>
                        <Input {...register("adSoyad")} placeholder="Adınız Soyadınız" className="h-11 bg-background/50" />
                        {errors.adSoyad && <p className="text-sm text-destructive">{errors.adSoyad.message}</p>}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label>Şifre Oluştur <span className="text-destructive">*</span></Label>
                            <Input type="password" {...register("password")} placeholder="••••••••" className="h-11 bg-background/50" />
                            
                            {/* Password Strength Indicators */}
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <Requirement label="En az 8 karakter" met={hasMinLength} />
                                <Requirement label="Büyük Harf (A-Z)" met={hasUpper} />
                                <Requirement label="Küçük Harf (a-z)" met={hasLower} />
                                <Requirement label="Rakam (0-9)" met={hasNumber} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Şifre Tekrar <span className="text-destructive">*</span></Label>
                            <Input type="password" {...register("confirmPassword")} placeholder="••••••••" className="h-11 bg-background/50" />
                            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                        </div>
                    </div>

                    <div className="pt-2">
                        <Turnstile 
                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                            onVerify={setTurnstileToken}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function Requirement({ label, met }: { label: string, met: boolean }) {
    return (
        <div className={cn("flex items-center gap-1.5 text-[10px] transition-colors duration-300", met ? "text-green-500" : "text-muted-foreground/60")}>
            {met ? <Check className="w-3 h-3" /> : <div className="w-1 h-1 rounded-full bg-current mx-1" />}
            {label}
        </div>
    );
}

// Change Log:
// - Added Turnstile to the 'email' step view.
// - Added logic to clear `turnstileToken` when changing steps.
// - Added validation to prevent email check without Turnstile token.
// - Updated `sendVerificationCode` to include `token` in the body.