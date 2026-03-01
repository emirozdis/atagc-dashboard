"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Compass, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 -z-10 bg-background pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center shadow-inner border border-primary/20">
          <Compass className="w-12 h-12 text-primary" />
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-7xl md:text-8xl font-display font-bold text-foreground tracking-tighter drop-shadow-sm">
            4<span className="text-primary">0</span>4
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Sayfa Bulunamadı
          </h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-sm mx-auto">
            Eğer bir hata olduğunu düşünüyorsanız, lütfen info@atagc.com.tr eposta adresinden veya panel üzerindeki destek sayfasından bize ulaşın.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
          <Button
            variant="outline"
            className="w-full sm:w-auto h-12 px-6 hover:bg-secondary/50 transition-colors"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Önceki Sayfaya Dön
          </Button>
          <Button asChild className="w-full sm:w-auto h-12 px-6 shadow-md transition-transform active:scale-95">
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Panele Dön
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Footer minimal signature */}
      <div className="absolute bottom-8 text-center w-full text-xs text-muted-foreground/50">
        ATAGÇ 2026 - Sistem Paneli
      </div>
    </div>
  );
}