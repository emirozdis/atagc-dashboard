"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, ShieldCheck, Printer, Loader2 } from "lucide-react";

interface KvkkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KvkkDialog({ open, onOpenChange }: KvkkDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  // Prevent body scroll when the overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Handle clicking outside the modal card
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  // Gizli Iframe ile Native Print / PDF tetikleme
  const handlePrintPdf = () => {
    setIsPreparing(true);

    // Yeni bir gizli iframe oluştur
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "-10000px";
    iframe.style.bottom = "-10000px";
    document.body.appendChild(iframe);

    // PDF/Yazdırma için tamamen bağımsız, tertemiz bir HTML şablonu
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>ATAGC KVKK Aydinlatma Metni</title>
        <style>
          @page { margin: 20mm; }
          body { 
            font-family: Arial, sans-serif; 
            color: #1a1a1a; 
            line-height: 1.6; 
            margin: 0;
            padding: 0;
          }
          h2 { 
            color: #000; 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 12px; 
            margin-bottom: 24px; 
            font-size: 20px; 
          }
          .highlight { 
            background-color: #f3f4f6; 
            border: 1px solid #e5e7eb; 
            padding: 16px; 
            border-radius: 8px; 
            margin-bottom: 24px; 
            font-size: 14px;
          }
          .section { margin-bottom: 20px; }
          .section h3 { 
            color: #000; 
            font-size: 15px; 
            margin-bottom: 8px; 
            border-bottom: 1px solid #f3f4f6; 
            padding-bottom: 4px; 
          }
          .section p { 
            font-size: 13px; 
            margin: 0; 
            padding-left: 12px; 
            text-align: justify; 
            color: #374151;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h2>Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni</h2>
        
        <div class="highlight">
          <p style="margin: 0;"><strong>ATAGÇ (Atatürk Gençliği Çalıştayı)</strong> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, veri sorumlusu sıfatıyla, kişisel verilerinizi aşağıda açıklanan amaçlar kapsamında; hukuka ve dürüstlük kurallarına uygun bir şekilde işleyebilecek, kaydedebilecek, saklayabilecek, sınıflandırabilecek, güncelleyebilecek ve mevzuatın izin verdiği hallerde üçüncü kişilere açıklayabilecek/aktarabileceğiz.</p>
        </div>

        <div class="section">
          <h3>1. Kişisel Verilerin İşlenme Amacı</h3>
          <p>Toplanan kişisel verileriniz (Ad-soyad, iletişim bilgileri, öğrenim durumu, doğum tarihi vb.); çalıştay başvurunuzun değerlendirilmesi, katılımcı kayıtlarının oluşturulması, etkinlik organizasyonunun sağlanması, gerekli bilgilendirmelerin yapılması, sertifikaların düzenlenmesi, konaklama ve ulaşım planlamalarının yapılması ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmektedir.</p>
        </div>

        <div class="section">
          <h3>2. Kişisel Verilerin Aktarılması ve Yurt Dışına Çıkarılması</h3>
          <p>Kişisel verileriniz; yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda, kanunen yetkili kamu kurumlarına ve faaliyetlerimizi yürütmek üzere hizmet aldığımız program ortaklarına, tedarikçi firmalara KVKK’nın 8. ve 9. maddelerinde belirtilen kişisel veri işleme şartları çerçevesinde aktarılabilecektir. Ayrıca depolama amacıyla yurt dışı bulut sunucularına aktarılabilir.</p>
        </div>

        <div class="section">
          <h3>3. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h3>
          <p>Kişisel verileriniz, internet sitemiz üzerinden doldurduğunuz başvuru formu aracılığıyla elektronik ortamda toplanmaktadır. Bu veriler, KVKK’nın 5. maddesinde belirtilen meşru menfaatler ve sözleşmenin kurulması hukuki sebeplerine dayanılarak işlenmektedir.</p>
        </div>

        <div class="section">
          <h3>4. Veri Güvenliği ve Sorumluluk Sınırı</h3>
          <p>ATAGÇ, kişisel verilerinizin güvenliğini sağlamak amacıyla gerekli tüm teknik ve idari tedbirleri almaktadır. Ancak olası siber saldırı veya yetkisiz erişim kaynaklı sızıntılardan ATAGÇ sorumlu tutulamaz.</p>
        </div>

        <div class="section">
          <h3>5. Veri Sahibinin Hakları</h3>
          <p>KVKK’nın 11. maddesi uyarınca veri sahipleri; kişisel verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, işlenme amacını öğrenme, aktarıldığı 3. kişileri bilme, düzeltilmesini, silinmesini veya yok edilmesini isteme haklarına sahiptir.</p>
        </div>

        <div class="section">
          <h3>6. İletişim</h3>
          <p>Taleplerinizi info@atagc.com.tr e-posta adresi üzerinden tarafımıza iletebilirsiniz.</p>
        </div>

        <div class="footer">
          Bu belge ATAGÇ (Atatürk Gençliği Çalıştayı) tarafından oluşturulmuştur.<br/>
          Tarih: ${new Date().toLocaleDateString('tr-TR')}
        </div>
      </body>
      </html>
    `;

    // İçeriği iframe'e yazdır
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      // İframe yüklendiğinde yazdırma ekranını çağır
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // İşlem bittikten sonra iframe'i DOM'dan temizle
        setTimeout(() => {
          document.body.removeChild(iframe);
          setIsPreparing(false);
        }, 1000);
      };
    } else {
      setIsPreparing(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200"
    >
      <div className="bg-background w-full sm:max-w-3xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:rounded-2xl border-t sm:border border-border shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 overflow-hidden">

        {/* HEADER */}
        <header className="flex items-start justify-between px-6 py-5 border-b bg-muted/10 shrink-0">
          <div className="flex gap-4 items-center pr-4">
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
                Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Lütfen kişisel verilerinizin işlenmesi ile ilgili bilgilendirme metnini dikkatlice okuyunuz.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => onOpenChange(false)}
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </Button>
        </header>

        {/* SCROLLABLE BODY */}
        <main className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 custom-scrollbar bg-background">
          <div className="text-sm text-muted-foreground leading-relaxed space-y-8 max-w-none">

            {/* INTRO HIGHLIGHT */}
            <div className="p-4 sm:p-5 bg-primary/5 rounded-xl border border-primary/10 text-foreground/90">
              <p>
                <strong>ATAGÇ (Atatürk Gençliği Çalıştayı)</strong> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, veri sorumlusu sıfatıyla, kişisel verilerinizi aşağıda açıklanan amaçlar kapsamında; hukuka ve dürüstlük kurallarına uygun bir şekilde işleyebilecek, kaydedebilecek, saklayabilecek, sınıflandırabilecek, güncelleyebilecek ve mevzuatın izin verdiği hallerde üçüncü kişilere açıklayabilecek/aktarabileceğiz.
              </p>
            </div>

            {/* SECTIONS */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-3 font-semibold text-foreground text-base border-b pb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-foreground text-xs font-bold shrink-0">
                  1
                </span>
                Kişisel Verilerin İşlenme Amacı
              </h3>
              <p className="pl-9">
                Toplanan kişisel verileriniz (Ad-soyad, iletişim bilgileri, öğrenim durumu, doğum tarihi vb.);
                çalıştay başvurunuzun değerlendirilmesi, katılımcı kayıtlarının oluşturulması, etkinlik organizasyonunun sağlanması,
                gerekli bilgilendirmelerin yapılması, sertifikaların düzenlenmesi, konaklama ve ulaşım planlamalarının yapılması
                ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmektedir.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-3 font-semibold text-foreground text-base border-b pb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-foreground text-xs font-bold shrink-0">
                  2
                </span>
                Kişisel Verilerin Aktarılması ve Yurt Dışına Çıkarılması
              </h3>
              <p className="pl-9">
                Kişisel verileriniz; yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda, kanunen yetkili kamu kurumlarına
                (örneğin; emniyet birimleri, ilgili bakanlıklar) ve faaliyetlerimizi yürütmek üzere hizmet aldığımız, iş birliği yaptığımız
                program ortaklarına, tedarikçi firmalara (konaklama, ulaşım vb. hizmet sağlayanlar) KVKK’nın 8. ve 9. maddelerinde belirtilen
                kişisel veri işleme şartları ve amaçları çerçevesinde aktarılabilecektir. Ayrıca, kişisel verileriniz depolama ve işlenme amacıyla yurt dışındaki sunuculara (bulut hizmetleri vb.) gönderilebilir ve bu sunucularda barındırılabilir.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-3 font-semibold text-foreground text-base border-b pb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-foreground text-xs font-bold shrink-0">
                  3
                </span>
                Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi
              </h3>
              <p className="pl-9">
                Kişisel verileriniz, internet sitemiz üzerinden doldurduğunuz başvuru formu aracılığıyla elektronik ortamda toplanmaktadır.
                Bu veriler, KVKK’nın 5. maddesinde belirtilen “ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla,
                veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması” ve “bir sözleşmenin kurulması veya ifasıyla
                doğrudan doğruya ilgili olması” hukuki sebeplerine dayanılarak işlenmektedir.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-3 font-semibold text-foreground text-base border-b pb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-foreground text-xs font-bold shrink-0">
                  4
                </span>
                Veri Güvenliği ve Sorumluluk Sınırı
              </h3>
              <p className="pl-9">
                ATAGÇ, kişisel verilerinizin güvenliğini sağlamak amacıyla gerekli tüm teknik ve idari tedbirleri almak için azami gayreti göstermektedir. Ancak, alınan tüm güvenlik önlemlerine rağmen yaşanabilecek olası bir siber saldırı veya yetkisiz erişim durumunda meydana gelebilecek veri sızıntılarından ATAGÇ sorumlu tutulamaz.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-3 font-semibold text-foreground text-base border-b pb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-foreground text-xs font-bold shrink-0">
                  5
                </span>
                Veri Sahibinin Hakları
              </h3>
              <p className="pl-9">
                KVKK’nın 11. maddesi uyarınca veri sahipleri; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme,
                işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme,
                verilerin eksik veya yanlış işlenmiş olması hâlinde düzeltilmesini isteme, kanun çerçevesinde silinmesini veya yok edilmesini isteme haklarına sahiptir.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-3 font-semibold text-foreground text-base border-b pb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-foreground text-xs font-bold shrink-0">
                  6
                </span>
                İletişim
              </h3>
              <p className="pl-9">
                KVKK kapsamındaki haklarınızla ilgili taleplerinizi{" "}
                <a
                  href="mailto:info@atagc.com.tr"
                  className="font-medium text-primary hover:underline transition-colors"
                >
                  info@atagc.com.tr
                </a>{" "}
                e-posta adresi üzerinden tarafımıza iletebilirsiniz.
              </p>
            </section>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="px-6 py-4 border-t bg-muted/10 shrink-0 flex items-center justify-end flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            onClick={handlePrintPdf}
            disabled={isPreparing}
            size="lg"
            className="w-full sm:w-auto shrink-0 font-semibold"
          >
            {isPreparing ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Printer className="w-5 h-5 mr-2" />
            )}
            PDF Kaydet / Yazdır
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            size="lg"
            className="w-full sm:w-auto shrink-0 font-semibold"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Okudum, Anladım
          </Button>
        </footer>

      </div>
    </div>
  );
}