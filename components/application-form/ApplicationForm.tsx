// components/application-form/ApplicationForm.tsx

"use client"

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";

// Components
import { StepIndicator } from "./StepIndicator";
import { AccountCreationStep } from "./AccountCreationStep";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { DynamicFormStep } from "./DynamicFormStep";
import { SuccessScreen } from "./SuccessScreen";

// Types
import { 
    accountCreationSchema, 
    AccountCreationData, 
    ApplicationFormTemplate,
    DynamicFormData,
    FullApplicationSubmission
} from "@/types/application";

export function ApplicationForm() {
  const { data: session, update } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  
  // Data States
  const [availableForms, setAvailableForms] = useState<ApplicationFormTemplate[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<AccountCreationData | null>(null);
  
  // Dynamic Answers Store
  const [formAnswers, setFormAnswers] = useState<DynamicFormData>({});
  
  // Auth Flow Control
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [turnstileToken, setTurnstileToken] = useState("");

  // Account Form Hook
  const accountForm = useForm<AccountCreationData>({
    resolver: zodResolver(accountCreationSchema),
    mode: "onChange"
  });

  // Fetch Forms on Mount
  useEffect(() => {
    fetch("/api/forms")
      .then(res => res.json())
      .then(data => {
          if (Array.isArray(data)) setAvailableForms(data);
      })
      .catch(console.error);
  }, []);

  // Scroll to form top when step changes (but not on initial render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentStep]);

  const handleRoleSelect = (formId: string) => {
    setSelectedFormId(formId);
    setCurrentStep(2);
  };

  const handleNext = async () => {
    // --- STEP 2: Account Creation/Login ---
    if (currentStep === 2) {
        const values = accountForm.getValues();
        const isDev = process.env.NODE_ENV === "development";
        const effectiveToken = turnstileToken || (isDev ? "DEV_BYPASS" : "");

        if (!effectiveToken) {
            toast.error("Doğrulama eksik.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (authMode === 'register') {
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
                        token: effectiveToken
                    })
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
                token: authMode === 'login' ? effectiveToken : "SKIPPED_AUTO_LOGIN"
            });

            if (loginRes?.error) throw new Error("Giriş başarısız");

            setAccountData(values);
            setCurrentStep(3);
            toast.success("Giriş Başarılı");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSubmitting(false);
        }
        return;
    }

    // --- STEP 3+: Dynamic Form Steps ---
    const selectedForm = availableForms.find(f => f.id === selectedFormId);
    if (!selectedForm) return;

    const dynamicStepIndex = currentStep - 3;
    const currentDynamicStep = selectedForm.steps[dynamicStepIndex];

    if (currentDynamicStep) {
        const missingFields = currentDynamicStep.fields.filter(f => f.required && !formAnswers[f.id]);
        if (missingFields.length > 0) {
            toast.error("Lütfen zorunlu alanları doldurunuz.");
            return;
        }

        if (dynamicStepIndex < selectedForm.steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    }
  };

  const handleSubmit = async () => {
    if (!accountData || !selectedFormId) return;

    setIsSubmitting(true);
    try {
        const payload: FullApplicationSubmission = {
            account: accountData,
            formId: selectedFormId,
            formData: formAnswers,
            kvkkApproved: true
        };

        const res = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Gönderim başarısız");
        }

        await update(); 
        setIsSubmitted(true);
        toast.success("Başvuru Alındı");
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleBack = () => {
      if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  if (isSubmitted) return <SuccessScreen onReset={() => window.location.reload()} />;

  const selectedForm = availableForms.find(f => f.id === selectedFormId);
  
  const displaySteps = [
      { number: 1, title: "Rol" },
      { number: 2, title: "Hesap" },
      { number: 3, title: "Bilgiler" }
  ];

  const indicatorStep = currentStep >= 3 ? 3 : currentStep;
  const totalDynamicSteps = selectedForm?.steps.length || 0;
  const currentDynamicStep = selectedForm?.steps[currentStep - 3];

  return (
    <div className="w-full max-w-3xl mx-auto relative" ref={formRef}>
        <StepIndicator steps={displaySteps} currentStep={indicatorStep} />

        <div>
            {currentStep === 1 && (
                <RoleSelectionStep 
                    forms={availableForms}
                    selectedId={selectedFormId}
                    onSelect={handleRoleSelect}
                />
            )}

            {currentStep === 2 && (
                <div className="space-y-6">
                    <AccountCreationStep 
                        form={accountForm}
                        isEmailVerified={isEmailVerified}
                        onVerify={setIsEmailVerified}
                        onModeChange={setAuthMode}
                        onTokenChange={setTurnstileToken}
                        onNext={handleNext}
                        isSubmitting={isSubmitting}
                    />
                    <div className="flex gap-3 pt-4">
                        <Button 
                            variant="ghost" 
                            onClick={handleBack} 
                            disabled={isSubmitting}
                            className="cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                        </Button>
                    </div>
                </div>
            )}

            {currentStep >= 3 && currentDynamicStep && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-display font-semibold">{currentDynamicStep.title}</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">Başvuru Detayları</p>
                        </div>
                        <div className="bg-secondary/30 px-3 py-1 rounded-full border border-border/50">
                            <span className="font-medium">{currentStep - 2}. Adım</span>
                        </div>
                    </div>
                    <DynamicFormStep 
                        step={currentDynamicStep}
                        answers={formAnswers}
                        onAnswerChange={(id, val) => setFormAnswers(prev => ({ ...prev, [id]: val }))}
                    />
                    <div className="flex gap-3 pt-4">
                        {currentStep > 1 && (
                            <Button 
                                variant="ghost" 
                                onClick={handleBack} 
                                disabled={isSubmitting}
                                className="cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                            </Button>
                        )}
                        <Button 
                            onClick={handleNext} 
                            disabled={isSubmitting} 
                            className="ml-auto shadow-md cursor-pointer"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                             (currentStep >= 3 && currentStep - 2 === totalDynamicSteps ? "Başvuruyu Tamamla" : "İleri")} <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}