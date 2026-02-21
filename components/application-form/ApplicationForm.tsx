"use client"

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2, ExternalLink, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";

// Components
import { StepIndicator } from "./StepIndicator";
import { AccountCreationStep } from "./AccountCreationStep";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { DynamicFormStep } from "./DynamicFormStep";
import { PersonalDetailsStep } from "./PersonalDetailsStep";
import { SuccessScreen } from "./SuccessScreen";

// Types
import { 
    accountCreationSchema, 
    AccountCreationData, 
    ApplicationFormTemplate,
    DynamicFormData,
    FullApplicationSubmission,
    personalDetailsSchema,
    PersonalDetailsData
} from "@/types/application";

interface ApplicationFormProps {
  initialForms?: ApplicationFormTemplate[];
  hasExistingApplication?: boolean;
}

export function ApplicationForm({ initialForms = [], hasExistingApplication = false }: ApplicationFormProps) {
  const { data: session, update } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(!hasExistingApplication);
  const formRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  
  // Data States
  const [availableForms, setAvailableForms] = useState<ApplicationFormTemplate[]>(initialForms);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<AccountCreationData | null>(null);
  
  // Dynamic Answers Store
  const [formAnswers, setFormAnswers] = useState<DynamicFormData>({});
  
  // Delegation Join (only for delegates)
  const [inviteCode, setInviteCode] = useState("");
  const [delegationJoined, setDelegationJoined] = useState(false);
  const [isJoiningDelegation, setIsJoiningDelegation] = useState(false);

  // Auth Flow Control
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [turnstileToken, setTurnstileToken] = useState("");

  // Forms
  const accountForm = useForm<AccountCreationData>({
    resolver: zodResolver(accountCreationSchema),
    mode: "onChange"
  });

  const personalForm = useForm<PersonalDetailsData>({
    resolver: zodResolver(personalDetailsSchema),
    mode: "onChange"
  });

  // Fallback fetch if no initial forms
  useEffect(() => {
    if (initialForms.length === 0) {
      fetch("/api/forms")
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setAvailableForms(data);
        })
        .catch(console.error);
    }
  }, [initialForms]);

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

  const handleJoinDelegation = async () => {
    if (!inviteCode.trim()) {
      toast.error("Lütfen davet kodunu giriniz.");
      return;
    }
    setIsJoiningDelegation(true);
    try {
      const res = await fetch("/api/delegation/join_delegation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Delegasyona katılım başarısız");
      }
      setDelegationJoined(true);
      toast.success("Delegasyona katılım isteği gönderildi! Delegasyon liderinin onayı bekleniyor.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsJoiningDelegation(false);
    }
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

    // --- STEP 3: Personal Details ---
    if (currentStep === 3) {
        let isValid = await personalForm.trigger();
        
        const selectedForm = availableForms.find(f => f.id === selectedFormId);
        const isDelegationLeader = selectedForm?.slug === "delegation";

        if (isDelegationLeader) {
            const delName = personalForm.getValues("delegation_name");
            if (!delName || delName.trim().length < 3) {
                personalForm.setError("delegation_name", { type: "manual", message: "Delegasyon adı en az 3 karakter olmalıdır." });
                isValid = false;
            }
        }

        if (isValid) {
            setCurrentStep(4);
        } else {
            toast.error("Lütfen bilgilerinizi kontrol ediniz.");
        }
        return;
    }

    // --- STEP 4+: Dynamic Form Steps ---
    const selectedForm = availableForms.find(f => f.id === selectedFormId);
    if (!selectedForm) return;

    const dynamicStepIndex = currentStep - 4;
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
            personalDetails: personalForm.getValues(),
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

        // Redirect delegation leaders to their delegation panel
        const submittedForm = availableForms.find(f => f.id === selectedFormId);
        if (submittedForm?.slug === "delegation") {
            toast.success("Delegasyon başvurunuz alındı! Yönlendiriliyorsunuz...");
            setTimeout(() => window.location.href = "/dashboard/delegation", 3500);
            return;
        }

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
  const isDelegationLeaderForm = selectedForm?.slug === "delegation";
  
  const displaySteps = [
      { number: 1, title: "Rol" },
      { number: 2, title: "Hesap" },
      { number: 3, title: "Kimlik" },
      { number: 4, title: "Form" }
  ];

  const indicatorStep = currentStep >= 4 ? 4 : currentStep;
  const totalDynamicSteps = selectedForm?.steps.length || 0;
  const currentDynamicStep = currentStep >= 4 ? selectedForm?.steps[currentStep - 4] : null;

  // Show buttons if user has existing application
  if (!showForm && hasExistingApplication) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="space-y-2 mb-8">
          <h2 className="text-3xl font-display font-bold">Hoşgeldiniz!</h2>
          <p className="text-muted-foreground">Yapmak istediğiniz işlemi seçiniz.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full h-12 cursor-pointer" variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Mevcut Başvurularım
            </Button>
          </Link>
          <Button 
            onClick={() => setShowForm(true)}
            className="flex-1 h-12 cursor-pointer"
          >
            Yeni Bir Başvuru Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto relative" ref={formRef}>
        <StepIndicator steps={displaySteps} currentStep={indicatorStep} />

        <div className="min-h-[400px]">
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
                </div>
            )}

            {currentStep === 3 && (
                <div className="animate-in fade-in duration-500 space-y-6">
                    {selectedForm?.slug === "delegate" && (
                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                <h4 className="font-semibold text-sm">Delegasyona Katıl</h4>
                            </div>
                            {delegationJoined ? (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Katılım isteği gönderildi. Delegasyon liderinin onayı bekleniyor.</span>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        Bir delegasyona katılmak için delegasyon liderinizden aldığınız davet kodunu giriniz.
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Davet kodu"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleJoinDelegation}
                                            disabled={isJoiningDelegation || !inviteCode.trim()}
                                            className="cursor-pointer"
                                            size="sm"
                                        >
                                            {isJoiningDelegation ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                "Katıl"
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <PersonalDetailsStep form={personalForm} isDelegation={isDelegationLeaderForm} />
                </div>
            )}

            {currentStep >= 4 && currentDynamicStep && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-display font-semibold">{currentDynamicStep.title}</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">Başvuru Detayları</p>
                        </div>
                        <div className="bg-secondary/30 px-3 py-1 rounded-full border border-border/50">
                            <span className="text-xs font-mono font-medium">
                                Adım {currentStep - 3} / {totalDynamicSteps}
                            </span>
                        </div>
                    </div>
                    <DynamicFormStep 
                        step={currentDynamicStep}
                        answers={formAnswers}
                        onAnswerChange={(id, val) => setFormAnswers(prev => ({ ...prev, [id]: val }))}
                    />
                </div>
            )}
        </div>

        <div className="flex justify-between pt-8 mt-8 border-t border-border">
            <Button 
                variant="ghost" 
                onClick={handleBack} 
                disabled={currentStep === 1 || isSubmitting}
                className="cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Geri
            </Button>
            
            {currentStep !== 1 && (
                <Button 
                    onClick={handleNext} 
                    disabled={isSubmitting} 
                    className="min-w-[140px] shadow-md cursor-pointer"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            {currentStep >= 4 && (currentStep - 3) === totalDynamicSteps 
                                ? "Başvuruyu Tamamla" 
                                : "İleri"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            )}
        </div>
    </div>
  );
}