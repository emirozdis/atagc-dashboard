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
    Check,
    Eye,
    EyeOff
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
    onNext: () => Promise<void>;
    isSubmitting: boolean;
}

export function AccountCreationStep({ form, isEmailVerified, onVerify, onModeChange, onTokenChange, onNext, isSubmitting }: AccountCreationStepProps) {
    const { register, formState: { errors }, watch, getValues, trigger, setValue } = form;

    // States
    const [stepState, setStepState] = useState<'email' | 'verifying' | 'details' | 'login'>('email');
    const [verificationCode, setVerificationCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailCheckLoading, setEmailCheckLoading] = useState(false);
    const [resumeName, setResumeName] = useState("");
    const [turnstileToken, setTurnstileToken] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [turnstileKey, setTurnstileKey] = useState(0);

    const email = watch("email");
    const password = watch("password");

    // Password criteria helpers
    const hasMinLength = password?.length >= 8;
    const hasUpper = /[A-Z]/.test(password || "");
    const hasLower = /[a-z]/.test(password || "");
    const hasNumber = /[0-9]/.test(password || "");

    useEffect(() => {
        onTokenChange(turnstileToken);
    }, [turnstileToken, onTokenChange]);

    useEffect(() => {
        setTurnstileToken("");
        setTurnstileKey(prev => prev + 1);
    }, [stepState]);

    const handleCheckEmail = async () => {
        const isEmailFormatValid = await trigger("email");
        if (!isEmailFormatValid) return;

        const isDev = process.env.NODE_ENV === "development";
        if (!turnstileToken && !isDev) {
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
                await sendVerificationCode();
            }
        } catch (e) {
            toast.error("Bağlantı hatası");
            setTurnstileToken("");
            setTurnstileKey(prev => prev + 1);
        } finally {
            setEmailCheckLoading(false);
        }
    };

    const sendVerificationCode = async () => {
        const isDev = process.env.NODE_ENV === "development";
        const effectiveToken = turnstileToken || (isDev ? "DEV_BYPASS" : "");

        setLoading(true);
        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: getValues("email"),
                    token: effectiveToken
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
            setTurnstileToken("");
            setTurnstileKey(prev => prev + 1);
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
        setTurnstileKey(prev => prev + 1);
    };

    const isDev = process.env.NODE_ENV === "development";
    const isEmailButtonDisabled = emailCheckLoading || !email || (!turnstileToken && !isDev);

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
                                    className="pl-10 h-11 bg-background/50 border-border/50 cursor-pointer"
                                    onKeyDown={(e) => e.key === 'Enter' && !isEmailButtonDisabled && handleCheckEmail()}
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={handleCheckEmail}
                                disabled={isEmailButtonDisabled}
                                className="h-11 px-6 shadow-md cursor-pointer"
                            >
                                {emailCheckLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            </Button>
                        </div>

                        {/* Turnstile Widget for Email Step */}
                        <div className="flex justify-center sm:justify-start">
                            <Turnstile
                                key={`turnstile-email-${turnstileKey}`}
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
                        <Button variant="ghost" onClick={resetFlow} className="h-11 px-3 text-muted-foreground hover:text-destructive cursor-pointer">
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
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                {...register("password")}
                                className="bg-background cursor-pointer pr-10"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground flex items-center justify-center">
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        <div className="flex justify-end">
                            <a href="/forgot-password" target="_blank" className="text-xs text-primary hover:underline">Şifremi Unuttum</a>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Turnstile
                            key={`turnstile-login-${turnstileKey}`}
                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                            onVerify={setTurnstileToken}
                        />
                    </div>

                    <Button onClick={onNext} disabled={isSubmitting} className="w-full cursor-pointer">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Devam Et"}
                    </Button>
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
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                setVerificationCode(value);
                            }}
                            className="text-center text-lg tracking-[0.5em] pb-1 font-mono h-12 w-48 bg-background"
                            maxLength={6}
                            inputMode="numeric"
                            placeholder="000000"
                        />
                        <Button onClick={handleVerifyCode} disabled={loading || verificationCode.length < 6} className="h-12 w-12 p-0 cursor-pointer">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        </Button>
                    </div>
                    <div className="text-center">
                        <button onClick={sendVerificationCode} disabled={loading} className="text-xs text-muted-foreground hover:text-primary underline cursor-pointer">
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
                        <Input {...register("adSoyad")} placeholder="Adınız Soyadınız" className="h-11 bg-background/50 cursor-pointer" />
                        {errors.adSoyad && <p className="text-sm text-destructive">{errors.adSoyad.message}</p>}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label>Şifre Oluştur <span className="text-destructive">*</span></Label>
                            <div className="relative">
                                <Input type={showPassword ? "text" : "password"} {...register("password")} placeholder="••••••••" className="h-11 bg-background/50 cursor-pointer pr-10" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground flex items-center justify-center">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

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
                            <div className="relative">
                                <Input type={showConfirmPassword ? "text" : "password"} {...register("confirmPassword")} placeholder="••••••••" className="h-11 bg-background/50 cursor-pointer pr-10" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground flex items-center justify-center">
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                        </div>
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