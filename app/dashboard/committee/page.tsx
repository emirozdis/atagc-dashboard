"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  Users, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  PenTool, 
  Calendar,
  Globe
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { VotingSystem } from "@/components/committee/VotingSystem";
import { CommitteeData } from "@/types/committee";
import { TourButton } from "@/components/dashboard/TourButton"; // New import

// --- Sub-Components ---

const CommitteeHero = ({ name, description, role }: { name: string; description: string; role: string }) => (
  <div id="tour-committee-hero" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-secondary/20 border border-border/50 p-8 md:p-10 mb-8">
    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
      <Globe className="w-64 h-64" />
    </div>
    
    <div className="relative z-10 space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20 text-primary px-3 py-1">
          {role === 'committee_chairman' ? 'Komite Başkanı' : 'Delege'}
        </Badge>
        <Badge variant="secondary" className="bg-background/50 backdrop-blur-sm">
          ATAGÇ 2026
        </Badge>
      </div>
      
      <div className="flex justify-between items-start">
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground">
            {name}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        <div className="hidden md:block">
            <TourButton />
        </div>
      </div>
    </div>
  </div>
);

const TopicCard = ({ topic }: { topic: { title: string; description: string } | null }) => (
  <Card id="tour-topic" className="bg-card/50 border-border/50 backdrop-blur-sm overflow-hidden h-full">
    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
    <CardHeader className="pb-3">
      <div className="flex items-center gap-2 text-primary font-semibold tracking-wide uppercase text-xs">
        <FileText className="w-4 h-4" />
        Gündem Maddesi
      </div>
      <CardTitle className="text-xl font-bold leading-tight">
        {topic?.title || "Gündem Belirlenmedi"}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {topic?.description || "Henüz bir çalışma konusu (topic) girilmemiştir."}
      </p>
    </CardContent>
  </Card>
);

const QuickActions = ({ canWrite }: { canWrite: boolean }) => (
  <Card id="tour-actions" className="border-border/50 h-full">
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        Hızlı İşlemler
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <Button asChild className="w-full justify-between group h-auto py-4" variant="secondary">
        <Link href="/dashboard/editor">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 bg-background rounded-lg border border-border/50 group-hover:border-primary/30 transition-colors">
              <PenTool className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">Ortak Çalışma</div>
              <div className="text-xs text-muted-foreground">Position paper & taslaklar</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Link>
      </Button>

      {!canWrite && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-600 flex gap-2 items-start">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Bu komitede yazma yetkiniz kısıtlanmıştır. Yalnızca görüntüleyebilirsiniz.</span>
        </div>
      )}
    </CardContent>
  </Card>
);

// --- Main Page Component ---

export default function CommitteePage() {
  const { data: session } = useSession();

  const { data: committeeData, isLoading } = useQuery<CommitteeData | null>({
    queryKey: ["committee-data"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.committeeMember ? {
        committee: json.committeeMember.committee,
        topic: json.topic,
        can_write: json.committeeMember.can_write
      } : null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-96 w-full lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!committeeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Users className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-display">Komite Bulunamadı</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Henüz bir komiteye atanmamış olabilirsiniz. Lütfen başvurunuzun onaylanmasını bekleyiniz veya yönetim ile iletişime geçiniz.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Panele Dön</Link>
        </Button>
      </div>
    );
  }

  const isChairman = session?.user?.role === 'committee_chairman';

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-20">
      
      {/* 1. Hero Section */}
      <CommitteeHero 
        name={committeeData.committee.name} 
        description={committeeData.committee.description} 
        role={session?.user?.role || 'applicant'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* 2. Left Column: Context & Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <TopicCard topic={committeeData.topic} />
          
          <QuickActions canWrite={committeeData.can_write} />

          {/* Metadata Card */}
          <div className="rounded-xl border border-border/40 p-4 bg-muted/5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Oturum
              </span>
              <span className="font-medium">1. Gün / Sabah</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Durum
              </span>
              <span className="font-medium text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Aktif
              </span>
            </div>
          </div>
        </div>

        {/* 3. Right Column: Voting & Operations (8 cols) */}
        <div id="tour-voting" className="lg:col-span-8 space-y-6">
          <VotingSystem 
            committeeId={committeeData.committee.id} 
            isChairman={isChairman} 
            userId={session?.user?.id || ""} 
          />
        </div>

      </div>
    </div>
  );
}