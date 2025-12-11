import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonalInfoData, SINIF_OPTIONS } from "@/types/application";
import { CheckCircle2, Loader2, MailCheck, Send } from "lucide-react";
import { toast } from "sonner";

interface PersonalInfoStepProps {
  form: UseFormReturn<PersonalInfoData>;
  isEmailVerified: boolean;
  onVerify: (status: boolean) => void;
}

export function PersonalInfoStep({ form, isEmailVerified, onVerify }: PersonalInfoStepProps) {
  const { register, formState: { errors }, setValue, watch, getValues, trigger } = form;
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const email = watch("email");

  const handleSendCode = async () => {
    // Validate email format first
    const isEmailValid = await trigger("email");
    if (!isEmailValid) return;

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsVerifying(true);
      toast.success("Doğrulama Kodu Gönderildi", {
        description: `${getValues("email")} adresine doğrulama kodu gönderildi. (Kod: 123456)`,
      });
    }, 1500);
  };

  const handleVerifyCode = () => {
    if (verificationCode === "123456") { // Mock check
      onVerify(true);
      setIsVerifying(false);
      toast.success("E-posta Doğrulandı", {
        description: "E-posta adresiniz başarıyla doğrulandı.",
      });
    } else {
      toast.error("Hatalı Kod", {
        description: "Lütfen kodu kontrol edip tekrar deneyiniz.",
      });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEmailVerified) {
      onVerify(false);
      setIsVerifying(false);
      setVerificationCode("");
    }
    // Call original onChange from react-hook-form
    register("email").onChange(e);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Label htmlFor="adSoyad" className="text-foreground">
          Ad Soyad <span className="text-destructive">*</span>
        </Label>
        <Input
          id="adSoyad"
          placeholder="Adınızı ve soyadınızı giriniz"
          {...register("adSoyad")}
        />
        {errors.adSoyad && (
          <p className="text-sm text-destructive">{errors.adSoyad.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground">
            E-posta <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 relative">
              <div className="relative w-full">
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  {...register("email")}
                  onChange={handleEmailChange}
                  className={isEmailVerified ? "border-green-500/50 bg-green-500/5 pr-10" : ""}
                />
                {isEmailVerified && (
                  <CheckCircle2 className="absolute right-3 top-2.5 w-5 h-5 text-green-500 animate-in fade-in zoom-in" />
                )}
              </div>
              
              {!isEmailVerified && !isVerifying && (
                <Button 
                  type="button" 
                  onClick={handleSendCode}
                  disabled={isLoading || !email}
                  variant="secondary"
                  className="shrink-0 w-[110px]"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Kod Gönder
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Verification Code Input Area */}
            {isVerifying && !isEmailVerified && (
              <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in">
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Doğrulama Kodu (123456)"
                  className="bg-primary/5 border-primary/20"
                  maxLength={6}
                />
                <Button 
                  type="button" 
                  onClick={handleVerifyCode}
                  className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Onayla
                </Button>
              </div>
            )}
            
            {isEmailVerified && (
              <div className="flex items-center gap-2 text-xs text-green-500 font-medium px-1">
                <MailCheck className="w-3.5 h-3.5" />
                <span>E-posta adresi doğrulandı</span>
              </div>
            )}
          </div>
          
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefon" className="text-foreground">
            Telefon <span className="text-destructive">*</span>
          </Label>
          <Input
            id="telefon"
            type="tel"
            placeholder="05XX XXX XX XX"
            {...register("telefon")}
          />
          {errors.telefon && (
            <p className="text-sm text-destructive">{errors.telefon.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="dogumTarihi" className="text-foreground">
            Doğum Tarihi <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dogumTarihi"
            type="date"
            {...register("dogumTarihi")}
            className="[color-scheme:dark]"
          />
          {errors.dogumTarihi && (
            <p className="text-sm text-destructive">{errors.dogumTarihi.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sinif" className="text-foreground">
            Sınıf <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("sinif")}
            onValueChange={(value) => setValue("sinif", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sınıfınızı seçiniz" />
            </SelectTrigger>
            <SelectContent>
              {SINIF_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sinif && (
            <p className="text-sm text-destructive">{errors.sinif.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="okul" className="text-foreground">
            Okul <span className="text-destructive">*</span>
          </Label>
          <Input
            id="okul"
            placeholder="Okulunuzun adını giriniz"
            {...register("okul")}
          />
          {errors.okul && (
            <p className="text-sm text-destructive">{errors.okul.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sehir" className="text-foreground">
            Şehir <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sehir"
            placeholder="Yaşadığınız şehir"
            {...register("sehir")}
          />
          {errors.sehir && (
            <p className="text-sm text-destructive">{errors.sehir.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Change Log:
// - Added isEmailVerified and onVerify props.
// - Implemented handleSendCode to simulate sending verification code.
// - Implemented handleVerifyCode to mock code validation (123456).
// - Added UI for verifying email (Send Code button, Code Input, Verified Checkmark).
// - Handled email input change to reset verification status.
// - Added visual feedback (toasts, loading states, success colors).