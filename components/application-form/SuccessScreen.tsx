import { CheckCircle, Instagram, Mail, LayoutDashboard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SuccessScreenProps {
  onReset: () => void;
}

export function SuccessScreen({ onReset }: SuccessScreenProps) {
  return (
    <div className="text-center py-8 md:py-12 animate-fade-in">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
        <CheckCircle className="w-10 h-10 text-primary" />
      </div>
      
      <h2 className="text-2xl md:text-3xl font-display font-bold gold-gradient mb-4">
        Başvurunuz Alındı!
      </h2>
      
      <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
        Başvurunuz başarıyla alınmıştır. Başvurunuz ekibimiz tarafından en kısa sürede 
        titizlikle değerlendirilecek ve sonuç, kayıtlı e-posta adresiniz üzerinden 
        tarafınıza iletilecektir.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <Button asChild className="w-full sm:w-auto h-12 px-8 shadow-lg shadow-primary/20">
          <Link href="/dashboard">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Panelime Git
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={onReset}
          className="w-full sm:w-auto h-12 px-8 border-primary/30 text-primary hover:bg-primary/10"
        >
          Yeni Başvuru Yap
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
        <a
          href="https://instagram.com/ituatagc"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-secondary-foreground text-sm"
        >
          <Instagram className="w-4 h-4" />
          <span>@ituatagc</span>
        </a>
        <a
          href="mailto:info@atagc.com.tr"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-secondary-foreground text-sm"
        >
          <Mail className="w-4 h-4" />
          <span>info@atagc.com.tr</span>
        </a>
      </div>

      <div className="pt-4 border-t border-border/40 max-w-xs mx-auto">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
          ATAGÇ 2026 Organizasyon Komitesi
        </p>
      </div>
    </div>
  );
}