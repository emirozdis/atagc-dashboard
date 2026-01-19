import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, useSession } from "next-auth/react"; // Imported useSession
import { toast } from "sonner";

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
  const { update } = useSession(); // Hook to trigger session refresh
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const handleNext = async () => {
    // --- STEP 1: Account ---
    if (currentStep === 1) {
        const values = accountForm.getValues();
        const isDev = process.env.NODE_ENV === "development";
        const effectiveToken = turnstileToken || (isDev ? "DEV_BYPASS" : "");

        if (!effectiveToken) {
            toast.error("Doğrulama eksik.");
            return;
        }

        if (authMode === 'register') {
            if (!isEmailVerified) {
                toast.error("E-posta doğrulanmadı.");
                return;
            }
            const isValid = await accountForm.trigger();
            if (!isValid) return;

            setIsSubmitting(true);
            try {
                // Register
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

                // Login
                const loginRes = await signIn("credentials", {
                    redirect: false,
                    email: values.email,
                    password: values.password,
                    token: "SKIPPED_AUTO_LOGIN"
                });

                if (loginRes?.error) throw new Error("Giriş yapılamadı");

                setAccountData(values);
                setCurrentStep(2);
                toast.success("Giriş Başarılı");
            } catch (e: any) {
                toast.error(e.message);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // Login Mode
            setIsSubmitting(true);
            try {
                const res = await signIn("credentials", {
                    redirect: false,
                    email: values.email,
                    password: values.password,
                    token: effectiveToken
                });
                if (res?.error) throw new Error("Giriş başarısız");
                
                setAccountData(values);
                setCurrentStep(2);
                toast.success("Giriş Başarılı");
            } catch (e: any) {
                toast.error(e.message);
            } finally {
                setIsSubmitting(false);
            }
        }
        return;
    }

    // --- STEP 2: Role Selection ---
    if (currentStep === 2) {
        if (!selectedFormId) {
            toast.error("Lütfen bir rol seçiniz.");
            return;
        }
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    // --- STEP 3..N: Dynamic Steps ---
    const selectedForm = availableForms.find(f => f.id === selectedFormId);
    if (!selectedForm) return;

    const dynamicStepIndex = currentStep - 3;
    const currentDynamicStep = selectedForm.steps[dynamicStepIndex];

    if (currentDynamicStep) {
        // Validate required fields
        const missingFields = currentDynamicStep.fields.filter(f => f.required && !formAnswers[f.id]);
        if (missingFields.length > 0) {
            toast.error("Lütfen zorunlu alanları doldurunuz.");
            return;
        }

        // Move to next dynamic step or finish
        if (dynamicStepIndex < selectedForm.steps.length - 1) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            // This was the last step, Trigger Submit
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

        // --- FIX: Force session refresh ---
        // This calls the JWT callback with trigger='update', forcing a DB refetch of the role.
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
  const dynamicSteps = selectedForm ? selectedForm.steps.map((s, i) => ({ number: i + 3, title: s.title })) : [];
  
  const steps = [
      { number: 1, title: "Hesap" },
      { number: 2, title: "Rol" },
      ...dynamicSteps
  ];

  const dynamicStepIndex = currentStep - 3;
  const currentDynamicStep = selectedForm?.steps[dynamicStepIndex];

  return (
    <div className="w-full max-w-3xl mx-auto">
        <StepIndicator steps={steps} currentStep={currentStep} />

        <div className="mb-8 min-h-[300px]">
            {currentStep === 1 && (
                <AccountCreationStep 
                    form={accountForm}
                    isEmailVerified={isEmailVerified}
                    onVerify={setIsEmailVerified}
                    onModeChange={setAuthMode}
                    onTokenChange={setTurnstileToken}
                />
            )}

            {currentStep === 2 && (
                <RoleSelectionStep 
                    forms={availableForms}
                    selectedId={selectedFormId}
                    onSelect={setSelectedFormId}
                />
            )}

            {currentStep >= 3 && currentDynamicStep && (
                <DynamicFormStep 
                    step={currentDynamicStep}
                    answers={formAnswers}
                    onAnswerChange={(id, val) => setFormAnswers(prev => ({ ...prev, [id]: val }))}
                />
            )}
        </div>

        <div className="flex justify-between pt-6 border-t border-border">
            <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1 || isSubmitting}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Geri
            </Button>
            
            <Button onClick={handleNext} disabled={isSubmitting} className="bg-primary text-primary-foreground">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                 (currentStep === steps.length ? "Gönder" : "İleri")}
                 {!isSubmitting && currentStep !== steps.length && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
        </div>
    </div>
  );
}

// Change Log:
// - Added `const { update } = useSession()` hook.
// - In `handleSubmit`, added `await update()` after successful API response.
// - This triggers the server-side JWT callback to re-fetch the user role (which was updated by the API) and update the session cookie.