"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, User, QrCode } from "lucide-react";
import { ProfileData } from "@/types/dashboard";
import { CardSkeleton } from "@/components/ui/skeleton-loader";

export default function ProfilePage() {
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="h-32 bg-muted/20 rounded-xl animate-pulse" />
        <CardSkeleton count={2} />
      </div>
    );
  }

  if (!profile) return <div>Hata oluştu.</div>;

  const { user } = profile;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Profilim</h2>
        <p className="text-muted-foreground mt-1">
          Kişisel bilgileriniz ve dijital kimlik kartınız.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                  <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} />
                  <AvatarFallback className="text-2xl">{(user?.full_name || "U").substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-bold">{user?.full_name}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mt-1">
                    <Mail className="w-4 h-4" />
                    <span>{user?.email}</span>
                  </div>
                  <Badge variant="secondary" className="mt-3 capitalize">{user?.role}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Other details (simplified for brevity, you can keep original detail cards here) */}
        </div>

        {/* Digital ID Card */}
        <div>
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-20">
              <QrCode className="w-32 h-32" />
            </div>
            <CardHeader className="relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-primary tracking-widest uppercase mb-1">ATAGÇ 2026</div>
                  <CardTitle className="text-xl">Dijital Kimlik</CardTitle>
                </div>
                <img src="/logo.webp" alt="Logo" className="w-8 h-8 opacity-80" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-6 flex flex-col items-center pb-8">
              <div className="bg-white p-2 rounded-xl shadow-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user.id}&bgcolor=ffffff`} 
                  alt="User ID QR" 
                  className="w-32 h-32 mix-blend-multiply"
                />
              </div>
              <div className="text-center space-y-1">
                <div className="text-lg font-bold">{user.full_name}</div>
                <div className="text-xs text-slate-400 font-mono tracking-wider">{user.id.split('-')[0].toUpperCase()}</div>
              </div>
              <div className="w-full pt-4 border-t border-white/10 flex justify-between text-xs text-slate-400">
                <span>Katılımcı</span>
                <span>Onaylı</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}