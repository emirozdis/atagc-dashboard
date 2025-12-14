import { CheckCircle, Instagram, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

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

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
        <a
          href="https://instagram.com/ituatagc"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-secondary-foreground"
        >
          <Instagram className="w-5 h-5" />
          <span>@ituatagc</span>
        </a>
        <a
          href="mailto:info@atagc.com.tr"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-secondary-foreground"
        >
          <Mail className="w-5 h-5" />
          <span>info@atagc.com.tr</span>
        </a>
      </div>

      <Button
        variant="outline"
        onClick={onReset}
        className="border-primary/30 text-primary hover:bg-primary/10"
      >
        Yeni Başvuru Yap
      </Button>
    </div>
  );
}

// Change Log:
// - Updated the success message text to be more formal and detailed as requested.