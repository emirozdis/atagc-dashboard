"use client"

import { ApplicationForm } from "@/components/application-form/ApplicationForm";
import { Calendar, MapPin, Instagram } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 bg-background"></div>

      {/* Header */}
      <header className="relative py-12 md:py-16 border-b border-border/30">
        <div className="container mx-auto">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="relative mb-6">
              <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full" />
              <img
                src="/logo.webp"
                alt="ATAGÇ Logo"
                className="relative w-24 h-24 md:w-32 md:h-32 object-contain"
              />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold gold-gradient mb-4 tracking-tight">
              ATAGÇ 2025
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl">
              Atatürk Gençliği Çalıştayı - Delegasyon Başvuru Formu
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm md:text-base text-foreground/80 bg-secondary/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-primary" />
                <span>15 - 16 - 17 Mayıs 2026</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-border/20" />
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-primary" />
                <span>İTÜ GVO İzmir NESAN Yerleşkesi</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto">
            <div className="bg-card/80 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-border/50 shadow-xl form-glow">
              <div className="mb-10 text-center">
                <h2 className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-3">
                  Delegasyon Başvurusu
                </h2>
                <p className="text-muted-foreground">
                  Lütfen formu eksiksiz ve doğru bilgilerle doldurunuz.
                </p>
              </div>
              <ApplicationForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/30 bg-card/30">
        <div className="container mx-auto">
          <div className="flex flex-col items-center text-center space-y-6">
            <img
              src="/logo.webp"
              alt="ATAGÇ Logo"
              className="w-12 h-12 object-contain opacity-80 grayscale hover:grayscale-0 transition-all duration-300"
            />
            <div className="space-y-2">
              <h3 className="text-lg font-display font-semibold text-foreground">
                ATAGÇ 2026
              </h3>
              <p className="text-muted-foreground text-sm">
                İTÜ GVO İzmir Atatürk Gençlik Çalıştayı
              </p>
            </div>

            <a
              href="https://instagram.com/ituatagc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-secondary/50 hover:bg-primary/20 border border-white/5 hover:border-primary/30 transition-all group"
            >
              <Instagram className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">@ituatagc</span>
            </a>

            <div className="w-full max-w-xs border-t border-border/10 pt-6 mt-2">
              <p className="text-muted-foreground/60 text-xs">
                © 2025 ATAGÇ. Tüm hakları saklıdır.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
// Change Log:
// - Replaced hardcoded `bg-[#181818]` with `bg-background`.
// - Updated card classes to use `bg-card/80` and `border-border/50`.