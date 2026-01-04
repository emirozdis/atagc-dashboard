"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Mail,
  MapPin,
  Calendar,
  Phone,
  GraduationCap,
  ShieldCheck,
  Building2,
  Hash,
  UserCog,
  Lock,
  Send,
  X,
  Maximize2
} from "lucide-react";
import { ProfileData } from "@/types/dashboard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/ui/skeleton-loader";

export default function ProfilePage() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Profile Query
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.user?.email) throw new Error("E-posta bulunamadı");

      const res = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.user.email }),
      });

      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Sıfırlama bağlantısı e-posta adresinize gönderildi.");
    },
    onError: () => {
      toast.error("Bağlantı gönderilemedi. Lütfen daha sonra tekrar deneyiniz.");
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-12 p-1">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Banner Skeleton */}
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm h-48">
          <div className="h-32 bg-muted/20 border-b border-border/50" />
          <div className="absolute bottom-6 left-8 flex items-end gap-6">
            <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
            <div className="space-y-2 mb-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm h-[400px]">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Skeleton className="w-full aspect-[3/4.8] rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-8 text-center text-muted-foreground">Profil verisi yüklenemedi.</div>;

  const { user, userDetails } = profile;
  const additional = userDetails?.additional_info || ({} as any);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "admin":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "committee_chairman":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "staff":
      case "staffleader":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const IDCardContent = ({ expanded = false }) => (
    <motion.div
      key={expanded ? "expanded" : "collapsed"}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative z-10 h-full flex flex-col p-6"
    >
      <div className="flex justify-between items-start mb-auto">
        <div>
          <div className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-1">Katılımcı Kartı</div>
          <div className="text-xl font-display font-bold tracking-tight">ATAGÇ 2026</div>
        </div>
        <img
          src="/logo.webp"
          alt="Logo"
          className="w-10 h-10 object-contain opacity-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
        />
      </div>

      <div className="flex flex-col items-center justify-center space-y-6 my-6">
        <div className="p-3 bg-white rounded-xl shadow-lg">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=${expanded ? '300x300' : '150x150'}&data=${user.id}&bgcolor=ffffff`}
            alt="User ID QR"
            className={cn("mix-blend-multiply transition-all duration-300", expanded ? "w-64 h-64" : "w-32 h-32")}
          />
        </div>
        <div className="text-center space-y-1">
          <div className={cn("font-bold truncate max-w-[200px] mx-auto transition-all duration-300", expanded ? "text-2xl" : "text-lg")}>
            {user.full_name}
          </div>
          <div className="text-xs text-slate-400 font-mono tracking-widest">{user.id.split('-')[0].toUpperCase()}</div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-end text-xs text-slate-300 font-medium">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Rol</span>
          <span className="capitalize text-white">{user.role}</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" />
          <span>Onaylı</span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Profilim</h1>
        <p className="text-muted-foreground">Kişisel bilgilerinizi ve hesap durumunuzu görüntüleyin.</p>
      </div>

      {/* Profile Header Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm">
        <div className="h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border/50" />
        <div className="px-8 pb-8 pt-0 flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12">
          <Avatar className="w-32 h-32 border-4 border-background shadow-xl ring-1 ring-border/10">
            <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
            <AvatarFallback className="text-4xl bg-primary/10 text-primary font-display font-bold">
              {(user.full_name || "U").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left space-y-1 pb-2">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">{user.full_name}</h2>
              <Badge variant="outline" className={cn("capitalize px-2.5 py-0.5", getRoleBadgeColor(user.role))}>
                {user.role === 'committee_chairman' ? 'Komite Başkanı' : user.role}
              </Badge>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground text-sm">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
          </div>

          <div className="pb-2 hidden md:block">
            <div className="text-xs text-muted-foreground text-right">
              <div>Üye ID</div>
              <div className="font-mono">{user.id.split('-')[0].toUpperCase()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Personal Info Card */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm h-full">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              Kişisel Bilgiler
            </CardTitle>
            <CardDescription>Sistemde kayıtlı olan bilgileriniz.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid gap-y-6">

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Okul
                </span>
                <div className="font-medium text-base text-foreground">{userDetails?.school_name || "-"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Sınıf / Şube
                </span>
                <div className="font-medium text-base text-foreground capitalize">{additional.grade || "-"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefon
                </span>
                <div className="font-medium text-base text-foreground font-mono">{userDetails?.phone_number || "-"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Şehir
                </span>
                <div className="font-medium text-base text-foreground">{additional.city || "-"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Doğum Tarihi
                </span>
                <div className="font-medium text-base text-foreground">
                  {userDetails?.birth_date ? new Date(userDetails.birth_date).toLocaleDateString('tr-TR', { dateStyle: 'long' }) : "-"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Sistem ID
                </span>
                <div className="font-medium text-sm text-foreground font-mono text-muted-foreground">{user.id}</div>
              </div>
            </div>

            {additional.mun_experience && (
              <div className="mt-2 pt-6 border-t border-border/50">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">MUN Deneyimi</span>
                <div className="bg-secondary/20 p-3 rounded-lg text-sm leading-relaxed border border-border/50">
                  {additional.mun_experience}
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Right Column: ID Card & Security */}
        <div className="flex flex-col gap-6 relative z-10">

          {/* Digital ID Card Wrapper */}
          <div className="relative w-full aspect-[3/4.8] sm:aspect-[1.586/1] lg:aspect-[3/4.8]">

            {/* The Placeholder Card (Active in grid when NOT expanded) */}
            {!isExpanded && (
              <motion.div
                layoutId="card-container"
                onClick={() => setIsExpanded(true)}
                className="w-full h-full cursor-pointer group [will-change:transform,opacity]"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="w-full h-full rounded-2xl overflow-hidden relative shadow-xl ring-1 ring-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white transform transition-transform group-hover:scale-[1.02] duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[60px] -mr-10 -mt-10" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-[50px] -ml-5 -mb-5" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                    <div className="bg-white/10 p-4 rounded-full backdrop-blur-md hover:bg-white/20">
                      <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <AnimatePresence><IDCardContent expanded={false} /></AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Helper Text below card */}
            <div className={cn("text-center text-xs text-muted-foreground px-4 mt-4 transition-opacity", isExpanded ? "opacity-0 pointer-events-none" : "opacity-100")}>
              Kartı büyütmek için üzerine tıklayın.
            </div>

            {/* Expanded Modal Overlay */}
            <AnimatePresence>
              {isExpanded && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsExpanded(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                  />
                  <motion.div
                    layoutId="card-container"
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    className="w-full max-w-[380px] aspect-[3/4.8] rounded-3xl overflow-hidden relative shadow-2xl ring-1 ring-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white z-50 [will-change:transform,opacity]"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[60px] -mr-10 -mt-10" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-[50px] -ml-5 -mb-5" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                      className="absolute top-4 right-4 z-50 bg-black/30 p-2 rounded-full hover:bg-black/50 backdrop-blur-md transition-colors border border-white/10"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                    <AnimatePresence><IDCardContent expanded={true} /></AnimatePresence>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Security Card */}
          <Card className="border-border/50 shadow-sm bg-muted/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Güvenlik
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Şifrenizi unuttuysanız veya değiştirmek istiyorsanız, e-posta adresinize sıfırlama bağlantısı gönderebilirsiniz.
              </div>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => resetPasswordMutation.mutate()}
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Sıfırlama Bağlantısı Gönder
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

// Change Log:
// - Refactored animation to only apply `layoutId` to the main card container for performance.
// - Content inside the card now uses `AnimatePresence` with a simple fade/scale effect, which is much faster.
// - Adjusted `transition` properties to a faster `duration` (0.4s) and a smoother `ease` curve for a more responsive feel.
// - Added `[will-change:transform,opacity]` to the motion components to hint the browser about upcoming animations, allowing for better GPU optimization.
// - Fixed the expand icon overlap by moving it to the center of the card on hover.
// - Removed the invisible placeholder logic as it's no longer necessary with this simplified animation strategy.