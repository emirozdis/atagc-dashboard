import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MotivationData } from "@/types/application";

interface MotivationStepProps {
  form: UseFormReturn<MotivationData>;
}

export function MotivationStep({ form }: MotivationStepProps) {
  const { register, formState: { errors }, setValue, watch } = form;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Label htmlFor="katilimNedeni" className="text-foreground">
          Neden ATAGÇ'ye katılmak istiyorsunuz? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="katilimNedeni"
          placeholder="Bu çalıştaya katılmak isteme nedenlerinizi açıklayınız... (En az 50 karakter)"
          className="min-h-[120px]"
          {...register("katilimNedeni")}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{errors.katilimNedeni?.message}</span>
          <span>{watch("katilimNedeni")?.length || 0}/1000</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="beklentiler" className="text-foreground">
          Çalıştaydan beklentileriniz nelerdir? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="beklentiler"
          placeholder="Bu deneyimden ne kazanmayı umuyorsunuz? Hedefleriniz nelerdir?... (En az 50 karakter)"
          className="min-h-[120px]"
          {...register("beklentiler")}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{errors.beklentiler?.message}</span>
          <span>{watch("beklentiler")?.length || 0}/1000</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kendinizTanitin" className="text-foreground">
          Kendinizi tanıtın <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="kendinizTanitin"
          placeholder="İlgi alanlarınız, hobileriniz, akademik başarılarınız ve sizi benzersiz kılan özellikleri paylaşınız... (En az 100 karakter)"
          className="min-h-[160px]"
          {...register("kendinizTanitin")}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{errors.kendinizTanitin?.message}</span>
          <span>{watch("kendinizTanitin")?.length || 0}/1500</span>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="kvkkOnay"
            checked={watch("kvkkOnay")}
            onCheckedChange={(checked) => setValue("kvkkOnay", checked === true, { shouldValidate: true })}
            className="mt-1"
          />
          <div className="space-y-1">
            <Label
              htmlFor="kvkkOnay"
              className="text-sm text-foreground cursor-pointer leading-relaxed"
            >
              KVKK Aydınlatma Metni'ni okudum ve kişisel verilerimin işlenmesini kabul ediyorum.{" "}
              <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Başvuru formunda paylaştığınız bilgiler yalnızca değerlendirme sürecinde kullanılacak 
              ve üçüncü şahıslarla paylaşılmayacaktır.
            </p>
          </div>
        </div>
        {errors.kvkkOnay && (
          <p className="text-sm text-destructive mt-2">{errors.kvkkOnay.message}</p>
        )}
      </div>
    </div>
  );
}
