import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonalInfoData, SINIF_OPTIONS } from "@/types/application";

export function PersonalInfoStep({ form }: { form: UseFormReturn<PersonalInfoData> }) {
  const { register, formState: { errors }, setValue, watch } = form;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Label htmlFor="telefon" className="text-foreground">
          Telefon Numarası <span className="text-destructive">*</span>
        </Label>
        <Input
          id="telefon"
          type="tel"
          placeholder="0555 555 55 55"
          {...register("telefon")}
        />
        {errors.telefon && (
          <p className="text-sm text-destructive">{errors.telefon.message}</p>
        )}
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
// - Added missing `telefon` input field which was causing the form to get stuck due to validation errors.