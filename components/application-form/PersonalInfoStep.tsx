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
import { AvatarUpload } from "@/components/ui/avatar-upload";

export function PersonalInfoStep({ form }: { form: UseFormReturn<PersonalInfoData> }) {
  const { register, formState: { errors }, setValue, watch } = form;
  const currentImage = watch("profile_picture_url");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Picture Upload */}
      <div className="flex flex-col items-center gap-4 mb-6">
        <AvatarUpload 
          currentImageUrl={currentImage}
          onUploadComplete={(url) => setValue("profile_picture_url", url)}
          size="large"
        />
        <div className="text-center space-y-1">
          <Label className="text-foreground">Profil Fotoğrafı</Label>
          <p className="text-xs text-muted-foreground">İsteğe bağlı. Yüzünüzün net göründüğü bir fotoğraf yükleyiniz.</p>
        </div>
      </div>

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