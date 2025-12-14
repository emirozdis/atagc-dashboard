import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExperienceData,
  MUN_DENEYIMI_OPTIONS,
  KOMITE_OPTIONS,
  INGILIZCE_OPTIONS,
} from "@/types/application";

interface ExperienceStepProps {
  form: UseFormReturn<ExperienceData>;
}

export function ExperienceStep({ form }: ExperienceStepProps) {
  const { register, formState: { errors }, setValue, watch } = form;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Label htmlFor="munDeneyimi" className="text-foreground">
          MUN / Çalıştay Deneyiminiz <span className="text-destructive">*</span>
        </Label>
        <Select
          value={watch("munDeneyimi")}
          onValueChange={(value) => setValue("munDeneyimi", value, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Deneyiminizi seçiniz" />
          </SelectTrigger>
          <SelectContent>
            {MUN_DENEYIMI_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.munDeneyimi && (
          <p className="text-sm text-destructive">{errors.munDeneyimi.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="oncekiKonferanslar" className="text-foreground">
          Katıldığınız Önceki Konferanslar (Opsiyonel)
        </Label>
        <Textarea
          id="oncekiKonferanslar"
          placeholder="Daha önce katıldığınız MUN konferanslarını ve aldığınız rolleri yazınız..."
          {...register("oncekiKonferanslar")}
        />
        {errors.oncekiKonferanslar && (
          <p className="text-sm text-destructive">{errors.oncekiKonferanslar.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="komiteTercihi1" className="text-foreground">
            Komite Tercihi (1. Tercih) <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("komiteTercihi1")}
            onValueChange={(value) => setValue("komiteTercihi1", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Komite seçiniz" />
            </SelectTrigger>
            <SelectContent>
              {KOMITE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.komiteTercihi1 && (
            <p className="text-sm text-destructive">{errors.komiteTercihi1.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="komiteTercihi2" className="text-foreground">
            Komite Tercihi (2. Tercih)
          </Label>
          <Select
            value={watch("komiteTercihi2") || ""}
            onValueChange={(value) => setValue("komiteTercihi2", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Komite seçiniz (opsiyonel)" />
            </SelectTrigger>
            <SelectContent>
              {KOMITE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="delegasyonTercihi" className="text-foreground">
            Delegasyon Tercihi <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("delegasyonTercihi")}
            onValueChange={(value) => setValue("delegasyonTercihi", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Delegasyon tipini seçiniz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bireysel">Bireysel Delegasyon</SelectItem>
              <SelectItem value="okul">Okul Delegasyonu</SelectItem>
            </SelectContent>
          </Select>
          {errors.delegasyonTercihi && (
            <p className="text-sm text-destructive">{errors.delegasyonTercihi.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ingilizce" className="text-foreground">
            İngilizce Seviyeniz <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("ingilizce")}
            onValueChange={(value) => setValue("ingilizce", value, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seviyenizi seçiniz" />
            </SelectTrigger>
            <SelectContent>
              {INGILIZCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.ingilizce && (
            <p className="text-sm text-destructive">{errors.ingilizce.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
