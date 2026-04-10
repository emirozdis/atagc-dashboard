import { ApplicationForm } from "@/components/application-form/ApplicationForm";
import { DelegationForm } from "@/components/application-form/DelegationForm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/SERVER_supabase";
import { Calendar, MapPin, Instagram, LogIn, LayoutDashboard } from "lucide-react";
import { ApplicationFormTemplate } from "@/types/application";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getApplicationStatus(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("applications_open")
      .single();
    return data?.applications_open ?? false;
  } catch {
    return false;
  }
}

async function getApplicationForms(): Promise<ApplicationFormTemplate[]> {
  try {
    const { data, error } = await supabase
      .from("application_forms")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch forms:", error);
      return [];
    }

    return data ?? [];
  } catch (error) {
    console.error("Failed to fetch forms:", error);
    return [];
  }
}

async function checkUserHasApplication(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (error) return false;
    return !!data;
  } catch (error) {
    return false;
  }
}

async function validateMagiclink(id: string): Promise<{ valid: boolean; email?: string; delegation_id?: string }> {
  try {
    const { data: magiclink, error } = await supabase
      .from("delegation_magiclinks")
      .select("id, sent_to, delegation, used")
      .eq("id", id)
      .maybeSingle();

    if (error || !magiclink || magiclink.used) {
      return { valid: false };
    }

    return { valid: true, email: magiclink.sent_to, delegation_id: magiclink.delegation };
  } catch {
    return { valid: false };
  }
}

interface HomeProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const magiclinkParam = typeof params.magiclink === "string" ? params.magiclink : undefined;
  const isApplicationsOpen = await getApplicationStatus();

  // Handle magiclink flow
  if (magiclinkParam) {
    const result = await validateMagiclink(magiclinkParam);
    const session = await getServerSession(authOptions);

    if (!result.valid) {
      redirect("/");
    }

    return (
      <main className="min-h-screen bg-background relative overflow-x-hidden">
        <div className="fixed inset-0 -z-10 bg-background"></div>

        <header className="relative pt-6 pb-12 md:pb-16 border-b border-border/30">
          <div className="container mx-auto px-4">
            <nav className="flex justify-end mb-4 md:mb-8">
               <Link href={session ? "/dashboard" : "/login"}>
                <Button variant="secondary" className="gap-2 bg-secondary/50 backdrop-blur-sm border border-white/10 hover:bg-secondary/80 transition-all shadow-sm">
                  {session ? <LayoutDashboard className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{session ? "Panele Git" : "Giriş Yap"}</span>
                </Button>
              </Link>
            </nav>

            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="relative mb-6">
                <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full" />
                <img
                  src="/logo.webp"
                  alt="ATAGÇ Logo"
                  className="relative w-24 h-24 md:w-36 md:h-36 object-contain"
                />
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold gold-gradient pb-4 tracking-tight">
                ATAGÇ 2026
              </h1>
              <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl">
                Delegasyon Kayıt Formu
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm md:text-base text-foreground/80 bg-secondary/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>2026</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-border/20" />
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>İzmir</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="py-12 md:py-20">
          <div className="container mx-auto">
            <div className="max-w-3xl mx-auto">
              <div className="bg-card/80 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-border/50 shadow-xl form-glow">
                {isApplicationsOpen ? (
                  <DelegationForm
                    magiclinkId={magiclinkParam}
                    magiclinkEmail={result.email!}
                  />
                ) : (
                  <div className="text-center space-y-6 py-8">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold">Başvurular Kapalı</h2>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                      Şu anda yeni başvuru alamıyoruz. Yeni güncellemeler ve duyurular için bizi Instagram'dan takip etmeye devam edin.
                    </p>
                    <Button asChild size="lg" className="mt-4 rounded-full px-8">
                      <a href="https://instagram.com/atagc26" target="_blank" rel="noopener noreferrer">
                        <Instagram className="w-5 h-5 mr-2" />
                        Instagram'da Takip Et
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

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
                  İzmir Atatürk Gençliği Çalıştayı
                </p>
              </div>

              <a
                href="https://instagram.com/atagc26"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-secondary/50 hover:bg-primary/20 border border-white/5 hover:border-primary/30 transition-all group"
              >
                <Instagram className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">@atagc26</span>
              </a>

              <div className="w-full max-w-xs border-t border-border/10 pt-6 mt-2">
                <p className="text-muted-foreground/60 text-xs">
                  © 2026 ATAGÇ. Tüm hakları saklıdır.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  // Normal flow
  const session = await getServerSession(authOptions);
  const initialForms = await getApplicationForms();

  let hasExistingApplication = false;
  if (session?.user?.id) {
    hasExistingApplication = await checkUserHasApplication(session.user.id);
  }

  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 bg-background"></div>

      {/* Header */}
      <header className="relative pt-6 pb-12 md:pb-16 border-b border-border/30">
        <div className="container mx-auto px-4">
          <nav className="flex justify-end mb-4 md:mb-8">
            <Link href={session ? "/dashboard" : "/login"}>
              <Button variant="secondary" className="gap-2 bg-secondary/50 backdrop-blur-sm border border-white/10 hover:bg-secondary/80 transition-all shadow-sm">
                {session ? <LayoutDashboard className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{session ? "Panele Git" : "Giriş Yap"}</span>
              </Button>
            </Link>
          </nav>

          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="relative mb-6">
              <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full" />
              <img
                src="/logo.webp"
                alt="ATAGÇ Logo"
                className="relative w-24 h-24 md:w-36 md:h-36 object-contain"
              />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold gold-gradient pb-4 tracking-tight">
              ATAGÇ 2026
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl">
              Atatürk Gençliği Çalıştayı Başvuru Portalı
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm md:text-base text-foreground/80 bg-secondary/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-primary" />
                <span>2026</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-border/20" />
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-primary" />
                <span>İzmir</span>
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
              {isApplicationsOpen ? (
                <ApplicationForm
                  initialForms={initialForms}
                  hasExistingApplication={hasExistingApplication}
                />
              ) : (
                <div className="text-center space-y-6 py-8">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-bold">Başvurular Kapalı</h2>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    Şu anda yeni başvuru alamıyoruz. Yeni güncellemeler ve duyurular için bizi Instagram'dan takip etmeye devam edin.
                  </p>
                  <Button asChild size="lg" className="mt-4 rounded-full px-8">
                    <a href="https://instagram.com/atagc26" target="_blank" rel="noopener noreferrer">
                      <Instagram className="w-5 h-5 mr-2" />
                      Instagram'da Takip Et
                    </a>
                  </Button>
                </div>
              )}
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
                İzmir Atatürk Gençliği Çalıştayı
              </p>
            </div>

            <a
              href="https://instagram.com/atagc26"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-secondary/50 hover:bg-primary/20 border border-white/5 hover:border-primary/30 transition-all group"
            >
              <Instagram className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">@atagc26</span>
            </a>

            <div className="w-full max-w-xs border-t border-border/10 pt-6 mt-2">
              <p className="text-muted-foreground/60 text-xs">
                © 2026 ATAGÇ. Tüm hakları saklıdır.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}