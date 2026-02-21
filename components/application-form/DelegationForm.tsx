"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";

import { StepIndicator } from "./StepIndicator";
import { AccountCreationStep } from "./AccountCreationStep";
import { PersonalDetailsStep } from "./PersonalDetailsStep";
import { SuccessScreen } from "./SuccessScreen";

import {
    accountCreationSchema,
    AccountCreationData,
    personalDetailsSchema,
    PersonalDetailsData,
} from "@/types/application";

interface DelegationFormProps {
    magiclinkId: string;
    magiclinkEmail: string;
}

export function DelegationForm({ magiclinkId, magiclinkEmail }: DelegationFormProps) {
    const { data: session, update } = useSession();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    const [accountData, setAccountData] = useState<AccountCreationData | null>(null);
    const [isEmailVerified, setIsEmailVerified] = useState(true);
    const [authMode, setAuthMode] = useState<"register" | "login">("register");
    const [turnstileToken, setTurnstileToken] = useState("");

    const accountForm = useForm<AccountCreationData>({
        resolver: zodResolver(accountCreationSchema),
        mode: "onChange",
        defaultValues: {
            email: magiclinkEmail,
        },
    });

    const personalForm = useForm<PersonalDetailsData>({
        resolver: zodResolver(personalDetailsSchema),
        mode: "onChange",
    });

    // Lock the email field to the magiclink email
    useEffect(() => {
        accountForm.setValue("email", magiclinkEmail);
    }, [magiclinkEmail, accountForm]);

    // Scroll to form top when step changes
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [currentStep]);

    const handleNext = async () => {
        // Step 1: Account Creation/Login
        if (currentStep === 1) {
            const values = accountForm.getValues();

            // Enforce email match
            if (values.email.toLowerCase() !== magiclinkEmail.toLowerCase()) {
                toast.error("Bu davet linki sadece " + magiclinkEmail + " adresi için geçerlidir.");
                accountForm.setValue("email", magiclinkEmail);
                return;
            }

            const isDev = process.env.NODE_ENV === "development";
            const effectiveToken = turnstileToken || (isDev ? "DEV_BYPASS" : "");

            if (!effectiveToken) {
                toast.error("Doğrulama eksik.");
                return;
            }

            setIsSubmitting(true);
            try {
                if (authMode === "register") {
                    if (!isEmailVerified) {
                        toast.error("E-posta doğrulanmadı.");
                        return;
                    }
                    const isValid = await accountForm.trigger();
                    if (!isValid) return;

                    const res = await fetch("/api/auth/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: values.email,
                            password: values.password,
                            fullName: values.adSoyad,
                            token: effectiveToken,
                        }),
                    });

                    if (!res.ok && res.status !== 409) {
                        const err = await res.json();
                        throw new Error(err.error || "Kayıt başarısız");
                    }
                }

                const loginRes = await signIn("credentials", {
                    redirect: false,
                    email: values.email,
                    password: values.password,
                    token: authMode === "login" ? effectiveToken : "SKIPPED_AUTO_LOGIN",
                });

                if (loginRes?.error) throw new Error("Giriş başarısız");

                setAccountData(values);
                setCurrentStep(2);
                toast.success("Giriş Başarılı");
            } catch (e: any) {
                toast.error(e.message);
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // Step 2: Personal Details → Submit
        if (currentStep === 2) {
            const isValid = await personalForm.trigger();
            if (!isValid) {
                toast.error("Lütfen bilgilerinizi kontrol ediniz.");
                return;
            }
            await handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/delegation/complete_magiclink", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    magiclink_id: magiclinkId,
                    personal_details: personalForm.getValues(),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Gönderim başarısız");
            }

            await update();
            setIsSubmitted(true);
            toast.success("Delegasyona başarıyla katıldınız!");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep((prev) => prev - 1);
    };

    if (isSubmitted) return <SuccessScreen onReset={() => (window.location.href = "/")} />;

    const displaySteps = [
        { number: 1, title: "Hesap" },
        { number: 2, title: "Kimlik" },
    ];

    return (
        <div className="w-full max-w-3xl mx-auto relative" ref={formRef}>
            <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground">
                    Delegasyon davet linki ile kayıt oluyorsunuz.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Kayıt e-postası: <span className="font-semibold text-foreground">{magiclinkEmail}</span>
                </p>
            </div>

            <StepIndicator steps={displaySteps} currentStep={currentStep} />

            <div className="min-h-[400px]">
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <AccountCreationStep
                            form={accountForm}
                            isEmailVerified={isEmailVerified}
                            onVerify={setIsEmailVerified}
                            onModeChange={setAuthMode}
                            onTokenChange={setTurnstileToken}
                            onNext={handleNext}
                            isSubmitting={isSubmitting}
                            lockedEmail
                        />
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="animate-in fade-in duration-500">
                        <PersonalDetailsStep form={personalForm} />
                    </div>
                )}
            </div>

            {/* Navigation Controls */}
            <div className="flex justify-between pt-8 mt-8 border-t border-border">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentStep === 1 || isSubmitting}
                    className="cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                </Button>

                {currentStep === 2 && (
                    <Button
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className="min-w-[140px] shadow-md cursor-pointer"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                Kaydı Tamamla
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
