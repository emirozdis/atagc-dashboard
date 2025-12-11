import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./StepIndicator";
import { PersonalInfoStep } from "./PersonalInfoStep";
import { ExperienceStep } from "./ExperienceStep";
import { MotivationStep } from "./MotivationStep";
import { SuccessScreen } from "./SuccessScreen";
import { toast } from "sonner";
import {
  PersonalInfoData,
  ExperienceData,
  MotivationData,
  personalInfoSchema,
  experienceSchema,
  motivationSchema,
  ApplicationFormData,
} from "@/types/application";

const STEPS = [
  { number: 1, title: "Kişisel Bilgiler" },
  { number: 2, title: "Deneyim ve Tercihler" },
  { number: 3, title: "Motivasyon" },
];

export function ApplicationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<ApplicationFormData>>({});
  const [isEmailVerified, setIsEmailVerified] = useState(false);

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
    let isValid = false;

    if (currentStep === 1) {
      if (!isEmailVerified) {
        toast.error("E-posta Doğrulaması Gerekli", {
          description: "Lütfen devam etmeden önce e-posta adresinizi doğrulayınız.",
        });
        personalInfoForm.trigger();
        return;
      }

      isValid = await personalInfoForm.trigger();
      if (isValid) {
        setFormData((prev) => ({
          ...prev,
          personalInfo: personalInfoForm.getValues(),
        }));
      }
    } else if (currentStep === 2) {
      isValid = await experienceForm.trigger();
      if (isValid) {
        setFormData((prev) => ({
          ...prev,
          experience: experienceForm.getValues(),
        }));
      }
    }

    if (isValid && currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    const isValid = await motivationForm.trigger();
    
    if (isValid) {
      setIsSubmitting(true);

      const finalData: ApplicationFormData = {
        personalInfo: formData.personalInfo!,
        experience: formData.experience!,
        motivation: motivationForm.getValues(),
      };

      try {
        // Updated endpoint from /api/submit-application to /api/applications
        const response = await fetch("/api/applications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(finalData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Bir hata oluştu");
        }
        
        toast.success("Başvuru Gönderildi!", {
          description: "Başvurunuz başarıyla alındı.",
        });

        setIsSubmitted(true);
      } catch (error) {
        console.error("Submit error:", error);
        toast.error("Başvuru Hatası", {
          description: "Başvuru gönderilirken bir sorun oluştu. Lütfen tekrar deneyiniz.",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setIsSubmitted(false);
    setFormData({});
    setIsEmailVerified(false);
    personalInfoForm.reset();
    experienceForm.reset();
    motivationForm.reset({ kvkkOnay: false });
  };

  if (isSubmitted) {
    return <SuccessScreen onReset={handleReset} />;
  }

  return (
    <div className="w-full">
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      <div className="mb-8">
        {currentStep === 1 && (
          <PersonalInfoStep 
            form={personalInfoForm} 
            isEmailVerified={isEmailVerified}
            onVerify={setIsEmailVerified}
          />
        )}
        {currentStep === 2 && <ExperienceStep form={experienceForm} />}
        {currentStep === 3 && <MotivationStep form={motivationForm} />}
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>

        {currentStep < 3 ? (
          <Button onClick={handleNext} className="bg-primary text-primary-foreground hover:bg-primary/90">
            İleri
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                Gönderiliyor...
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              </>
            ) : (
              <>
                Başvuruyu Gönder
                <Send className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Change Log:
// - Updated `handleSubmit` to fetch to `/api/applications` instead of `/api/submit-application`.