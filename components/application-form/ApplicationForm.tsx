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

      if (authMode === 'register') {
        // Validate Full Registration Form
        if (!isEmailVerified) {
          toast.error("E-posta doğrulaması gerekli");
          return;
        }
        const isValid = await accountCreationForm.trigger();
        if (!isValid) return;

        setIsSubmitting(true);
        try {
          // 1. Create Account
          const registerRes = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: values.email,
              password: values.password,
              fullName: values.adSoyad,
            }),
          });

          if (!registerRes.ok) {
            const data = await registerRes.json();
            throw new Error(data.error || "Kayıt oluşturulamadı.");
          }

          // 2. Login
          const loginRes = await signIn("credentials", {
            redirect: false,
            email: values.email,
            password: values.password,
          });

          if (loginRes?.error) throw new Error("Giriş yapılamadı.");

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
// - Added error toasts on `handleNext` when validation fails, preventing the "silent stuck" feeling.
// - This ensures the user knows why they can't proceed (e.g. if they missed a field).