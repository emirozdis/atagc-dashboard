"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KvkkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KvkkDialog({ open, onOpenChange }: KvkkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni</DialogTitle>
          <DialogDescription>
            Lütfen kişisel verilerinizin işlenmesi ile ilgili bilgilendirme metnini dikkatlice okuyunuz.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-6">
            <p>
              <strong>ATAGÇ (Atatürk Gençliği Çalıştayı)</strong> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, veri sorumlusu sıfatıyla, kişisel verilerinizi aşağıda açıklanan amaçlar kapsamında; hukuka ve dürüstlük kurallarına uygun bir şekilde işleyebilecek, kaydedebilecek, saklayabilecek, sınıflandırabilecek, güncelleyebilecek ve mevzuatın izin verdiği hallerde üçüncü kişilere açıklayabilecek/aktarabileceğiz.
            </p>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">1. Kişisel Verilerin İşlenme Amacı</h3>
              <p>
                Toplanan kişisel verileriniz (Ad-soyad, iletişim bilgileri, öğrenim durumu, doğum tarihi vb.); 
                çalıştay başvurunuzun değerlendirilmesi, katılımcı kayıtlarının oluşturulması, etkinlik organizasyonunun sağlanması, 
                gerekli bilgilendirmelerin yapılması, sertifikaların düzenlenmesi, konaklama ve ulaşım planlamalarının yapılması 
                ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmektedir.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">2. Kişisel Verilerin Aktarılması</h3>
              <p>
                Kişisel verileriniz; yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda, kanunen yetkili kamu kurumlarına 
                (örneğin; emniyet birimleri, ilgili bakanlıklar) ve faaliyetlerimizi yürütmek üzere hizmet aldığımız, iş birliği yaptığımız 
                program ortaklarına, tedarikçi firmalara (konaklama, ulaşım vb. hizmet sağlayanlar) KVKK’nın 8. ve 9. maddelerinde belirtilen 
                kişisel veri işleme şartları ve amaçları çerçevesinde aktarılabilecektir.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">3. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h3>
              <p>
                Kişisel verileriniz, internet sitemiz üzerinden doldurduğunuz başvuru formu aracılığıyla elektronik ortamda toplanmaktadır. 
                Bu veriler, KVKK’nın 5. maddesinde belirtilen “ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, 
                veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması” ve “bir sözleşmenin kurulması veya ifasıyla 
                doğrudan doğruya ilgili olması” hukuki sebeplerine dayanılarak işlenmektedir.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">4. Veri Sahibinin Hakları</h3>
              <p>
                KVKK’nın 11. maddesi uyarınca veri sahipleri; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, 
                işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme, 
                verilerin eksik veya yanlış işlenmiş olması hâlinde düzeltilmesini isteme, kanun çerçevesinde silinmesini veya yok edilmesini isteme haklarına sahiptir.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">5. İletişim</h3>
              <p>
                KVKK kapsamındaki haklarınızla ilgili taleplerinizi <strong className="text-foreground">info@atagc.com.tr</strong> e-posta adresi üzerinden 
                tarafımıza iletebilirsiniz. Başvurunuz en kısa sürede ve en geç 30 gün içinde sonuçlandırılacaktır.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Change Log:
// - Created new component for displaying the full KVKK legal text in a modal dialog.
// - Content is structured with clear sections tailored for an event organization context.