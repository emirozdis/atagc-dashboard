import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { StepIndicator } from "./StepIndicator";
import { AccountCreationStep } from "./AccountCreationStep";
import { PersonalInfoStep } from "./PersonalInfoStep";
import { ExperienceStep } from "./ExperienceStep";
import { MotivationStep } from "./MotivationStep";
import { SuccessScreen } from "./SuccessScreen";
import { toast } from "sonner";
import {
  AccountCreationData,
  PersonalInfoData,
  ExperienceData,
  MotivationData,
  accountCreationSchema,
  personalInfoSchema,
  experienceSchema,
  motivationSchema,
  ApplicationFormData,
} from "@/types/application";

const STEPS = [
  { number: 1, title: "Hesap İşlemleri" },
  { number: 2, title: "Kişisel Bilgiler" },
  { number: 3, title: "Deneyim" },
  { number: 4, title: "Motivasyon" },
];

export function ApplicationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<ApplicationFormData>>({});
  
  // Flow Control States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [turnstileToken, setTurnstileToken] = useState("");

  const accountCreationForm = useForm<AccountCreationData>({
    resolver: zodResolver(accountCreationSchema),
    defaultValues: formData.accountCreation || {},
    mode: "onChange"
  });

  const personalInfoForm = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: formData.personalInfo || {},
  });

  const experienceForm = useForm<ExperienceData>({
    resolver: zodResolver(experienceSchema),
    defaultValues: formData.experience || {},
  });

  const motivationForm = useForm<MotivationData>({
    resolver: zodResolver(motivationSchema),
    defaultValues: formData.motivation || {
      kvkkOnay: false,
    },
  });

  const handleNext = async () => {
    // --- Step 1: Account Logic (Register or Login) ---
    if (currentStep === 1) {
      const values = accountCreationForm.getValues();

      if (!turnstileToken) {
        toast.error("Lütfen doğrulamayı tamamlayın.");
        return;
      }

      if (authMode === 'register') {
        // Validate Full Registration Form
        if (!isEmailVerified) {
          toast.error("E-posta doğrulaması gerekli");
          return;
        }
        const isValid = await accountCreationForm.trigger();
        if (!isValid) return;

        setIsSubmitting(true);
        let accountCreated = false;

        try {
          // 1. Create Account
          const registerRes = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: values.email,
              password: values.password,
              fullName: values.adSoyad,
              token: turnstileToken, // Pass token for registration verification
            }),
          });

          if (!registerRes.ok) {
            const data = await registerRes.json();
            // If account already exists (409), but we are in register mode (e.g. user refreshed or retried),
            // and we know they passed email verification steps, we can try to log them in directly
            if (registerRes.status === 409) {
                // Account exists, try login instead of throwing error
                console.log("Account already exists, switching to login attempt.");
                accountCreated = true;
            } else {
                throw new Error(data.error || "Kayıt oluşturulamadı.");
            }
          } else {
            accountCreated = true;
          }

          // 2. Login
          // Important: We send a specific dummy token for auto-login to prevent "token used" errors
          // The backend `authorize` function will check `isNewUser` based on `created_at` timestamp.
          const loginRes = await signIn("credentials", {
            redirect: false,
            email: values.email,
            password: values.password,
            token: "SKIPPED_AUTO_LOGIN", 
          });

          if (loginRes?.error) {
             // If login failed but account was created, we shouldn't trap the user in the register form.
             // They should proceed or be told to login manually.
             // However, for this flow, we will assume success if account created, 
             // but show a toast that login failed and maybe they need to re-login later.
             // Ideally, we just proceed if we can confirm account exists.
             console.error("Auto-login failed:", loginRes.error);
             
             if (accountCreated) {
                 toast.success("Hesap oluşturuldu, lütfen giriş yapınız.");
                 // Force switch to login mode so they can try again if needed, or redirect
                 window.location.href = "/login";
                 return;
             } else {
                 throw new Error("Giriş yapılamadı.");
             }
          }

          toast.success("Hesap Oluşturuldu");
          proceedToStep2(values);

        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsSubmitting(false);
        }

      } else {
        // Login Mode (Resume)
        if (!values.password) {
          accountCreationForm.setError("password", { message: "Şifre giriniz" });
          return;
        }

        setIsSubmitting(true);
        try {
          const loginRes = await signIn("credentials", {
            redirect: false,
            email: values.email,
            password: values.password,
            token: turnstileToken, // Normal login needs verification
          });

          if (loginRes?.error) throw new Error("E-posta veya şifre hatalı.");

          toast.success("Giriş Başarılı", { description: "Başvurunuza devam edebilirsiniz." });
          proceedToStep2(values);

        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsSubmitting(false);
        }
      }
    } 
    
    // --- Step 2: Personal Info ---
    else if (currentStep === 2) {
      const isValid = await personalInfoForm.trigger();
      if (isValid) {
        setFormData((prev) => ({ ...prev, personalInfo: personalInfoForm.getValues() }));
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error("Lütfen tüm zorunlu alanları doldurunuz.");
      }
    } 
    
    // --- Step 3: Experience ---
    else if (currentStep === 3) {
      const isValid = await experienceForm.trigger();
      if (isValid) {
        setFormData((prev) => ({ ...prev, experience: experienceForm.getValues() }));
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error("Lütfen tüm zorunlu alanları doldurunuz.");
      }
    }
  };

  const proceedToStep2 = (accountValues: AccountCreationData) => {
    setFormData((prev) => ({ ...prev, accountCreation: accountValues }));
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    const isValid = await motivationForm.trigger();
    if (!isValid) {
        toast.error("Lütfen tüm zorunlu alanları doldurunuz.");
        return;
    }

    setIsSubmitting(true);
    const finalData: ApplicationFormData = {
      accountCreation: formData.accountCreation!,
      personalInfo: formData.personalInfo!,
      experience: formData.experience!,
      motivation: motivationForm.getValues(),
    };

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Hata oluştu");

      setIsSubmitted(true);
      toast.success("Başvuru Gönderildi!");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) return <SuccessScreen onReset={() => window.location.reload()} />;

  return (
    <div className="w-full">
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      <div className="mb-8">
        {currentStep === 1 && (
          <AccountCreationStep
            form={accountCreationForm}
            isEmailVerified={isEmailVerified}
            onVerify={setIsEmailVerified}
            onModeChange={setAuthMode}
            onTokenChange={setTurnstileToken}
          />
        )}
        {currentStep === 2 && <PersonalInfoStep form={personalInfoForm} />}
        {currentStep === 3 && <ExperienceStep form={experienceForm} />}
        {currentStep === 4 && <MotivationStep form={motivationForm} />}
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Geri
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>İleri <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isSubmitting ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> Gönderiliyor</> : <><Send className="w-4 h-4 ml-2" /> Başvuruyu Gönder</>}
          </Button>
        )}
      </div>
    </div>
  );
}

// Change Log:
// - Updated `handleNext` logic to use a special token "SKIPPED_AUTO_LOGIN" for the auto-login step after registration.
// - Added fallback: if account creation succeeds but auto-login fails, redirect to login page instead of showing an error state that traps the user.
// - Handled 409 (Account Exists) gracefully in registration flow if it was a race condition/retry.