"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Users, FileText, ArrowRight, PenTool, Calendar, Archive, BarChart, Clock, UserCheck, Layout, Info, CheckCircle2, Vote as VoteIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VotingSystem } from "@/components/committee/VotingSystem";
import { RollCallHistory } from "@/components/committee/RollCallHistory";
import { CommitteeData, CommitteeMember } from "@/types/committee";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

// --- Sub-Components ---

const SessionInfoPanel = ({ isManager, stats }: { isManager: boolean, stats: any }) => {
  if (isManager) {
    if (!stats) return <div className="h-20 w-48 bg-white/5 animate-pulse rounded-lg" />;

    return (
      <div className="flex flex-col gap-4 min-w-[200px] text-right md:text-left md:items-end">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Üye</span>
            <div className="text-2xl font-bold text-foreground flex items-center gap-1">
              {stats.total_members}
              <Users className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Katılım</span>
            <div className="text-2xl font-bold text-foreground flex items-center gap-1">
              %{stats.last_roll_call?.attendance_rate ?? 0}
              <UserCheck className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </div>
        </div>

        {stats.last_roll_call && (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-background/40 px-3 py-1.5 rounded-full border border-border/50">
            <Clock className="w-3 h-3" />
            <span className="opacity-90">Son: {stats.last_roll_call.session_name}</span>
          </div>
        )}
      </div>
    );
  }

  // Participant View
  return (
    <div className="flex flex-col items-start md:items-end gap-2 min-w-[200px]">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 px-2 py-0.5 gap-1.5 text-xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          Oturum Aktif
        </Badge>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
        Genel Kurul
        <span className="text-muted-foreground">•</span>
        <span className="text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Yoklama Tamam
        </span>
      </div>
    </div>
  );
};

const MembersWidget = ({ members }: { members?: any[] }) => {
  const [showAll, setShowAll] = useState(false);

  if (!members || members.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Komite Üyeleri
          </span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">--</Badge>
        </div>
        <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border/50 rounded-xl bg-muted/5">
          Üye listesi görüntülenemiyor
        </div>
      </div>
    );
  }

  const getUserData = (member: any) => {
    const user = member.user || member.User;
    const target = user || member;

    const getImg = (u: any) => {
      if (!u) return undefined;

      // 1. Check user_details for profile picture (matches UserSelectionTable logic)
      if (u.user_details) {
        const details = Array.isArray(u.user_details) ? u.user_details[0] : u.user_details;
        if (details?.profile_picture_url) return details.profile_picture_url;
      }

      // 2. Check standard properties
      return u.image || u.avatar_url || u.profile_picture_url || undefined;
    };

    return {
      name: target.full_name || target.name || "Bilinmeyen Üye",
      image: getImg(target),
      email: target.email,
      role: target.role || "applicant"
    };
  };

  const sortedMembers = [...members].sort((a, b) => {
    const rank = (role: string) => {
      if (role === 'committee_chairman') return 3;
      if (role === 'deputy_chair') return 2;
      return 1;
    };
    const roleA = a.role || a.user?.role || 'applicant';
    const roleB = b.role || b.user?.role || 'applicant';
    return rank(roleB) - rank(roleA);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Komite Üyeleri
        </span>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">{members.length}</Badge>
      </div>

      <div className="space-y-3">
        {sortedMembers.slice(0, 6).map(member => {
          const { name, image, role } = getUserData(member);
          const displayName = name || "Üye";

          return (
            <div key={member.id || Math.random()} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
              <Avatar className="h-8 w-8 border border-transparent group-hover:border-border/50 transition-colors">
                <AvatarImage src={image} className="object-cover" />
                <AvatarFallback className="text-xs text-muted-foreground bg-secondary">
                  {displayName[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium truncate text-foreground/90">
                    {displayName}
                  </div>
                  {role === 'committee_chairman' && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-purple-500/10 text-purple-500 border-purple-500/20">Başkan</Badge>
                  )}
                  {role === 'deputy_chair' && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Bşk. Yrd.</Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {role === 'committee_chairman' ? 'Committee Chairman' : role === 'deputy_chair' ? 'Başkan Yardımcısı' : 'Delege'}
                </div>
              </div>
            </div>
          );
        })}
        {sortedMembers.length > 6 && (
          <div className="pt-2 px-2">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-primary w-auto"
              onClick={() => setShowAll(true)}
            >
              + {sortedMembers.length - 6} diğer üye
            </Button>
          </div>
        )}

        <Dialog open={showAll} onOpenChange={setShowAll}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Tüm Üyeler ({members.length})</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {sortedMembers.map(member => {
                  const { name, image, role } = getUserData(member);
                  return (
                    <div key={member.id || Math.random()} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={image} className="object-cover" />
                        <AvatarFallback className="text-xs">{name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{name || "Bilinmeyen"}</span>
                          {role === 'committee_chairman' && <Badge className="text-[9px] h-4 px-1 bg-purple-500/10 text-purple-600 border-purple-500/20 shadow-none">Başkan</Badge>}
                          {role === 'deputy_chair' && <Badge className="text-[9px] h-4 px-1 bg-indigo-500/10 text-indigo-600 border-indigo-500/20 shadow-none">Bşk. Yrd.</Badge>}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {role === 'committee_chairman' ? 'Komite Başkanı' : role === 'deputy_chair' ? 'Başkan Yardımcısı' : 'Delege'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

const CommitteeHero = ({
  name,
  description,
  role,
  children
}: {
  name: string;
  description: string;
  role: string;
  children?: React.ReactNode;
}) => (
  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-muted/30 to-background border border-border/50 p-6 md:p-10 shadow-sm">
    <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
      <Layout className="w-96 h-96 -rotate-12" />
    </div>

    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
      <div className="space-y-4 max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="border-primary/20 text-primary px-3 py-1 text-xs uppercase tracking-wider">
            {role === 'committee_chairman' ? 'Komite Başkanı' : role === 'deputy_chair' ? 'Başkan Yardımcısı' : 'Delege'}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">ATAGÇ 2026</span>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight text-foreground leading-tight">
            {name}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      <div className="shrink-0 w-full md:w-auto border-t md:border-t-0 md:border-l border-border/50 pt-6 md:pt-0 md:pl-8">
        {children}
      </div>
    </div>
  </div>
);

const TopicCard = ({ topic }: { topic: { title: string; description: string } | null }) => (
  <Card className="group relative overflow-hidden bg-card border-border/50 shadow-sm flex flex-col h-full min-h-[250px] transition-all hover:shadow-md hover:border-primary/20">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

    <CardHeader className="pb-4 relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase shadow-sm">
          <FileText className="w-3.5 h-3.5" />
          Gündem
        </div>
        {!topic && (
          <Badge variant="secondary" className="text-[10px] bg-muted/80 text-muted-foreground hover:bg-muted font-normal">
            Bekleniyor
          </Badge>
        )}
      </div>
      <CardTitle className="text-2xl md:text-3xl font-display font-bold leading-tight text-foreground tracking-tight">
        {topic?.title || "Gündem Belirlenmedi"}
      </CardTitle>
    </CardHeader>
    <CardContent className="flex-grow relative z-10">
      {topic ? (
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-base">
          {topic.description}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
            <Info className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground font-medium">Henüz bir konu girilmemiştir.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Komite başkanı tarafından belirlenecektir.</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const QuickActions = ({ onOpenVoting }: { onOpenVoting: () => void }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <Link href="/dashboard/editor" className="group">
      <div className="h-full border border-border/50 bg-card rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer shadow-sm hover:shadow-md">
        <div className="p-3 bg-primary/5 text-primary rounded-lg group-hover:scale-105 transition-transform">
          <PenTool className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Ortak Çalışma</h3>
          <p className="text-xs text-muted-foreground">Resolution Paper</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>

    <div
      onClick={onOpenVoting}
      className="group h-full border border-border/50 bg-card rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/30 hover:bg-muted/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
    >
      <div className="p-3 bg-blue-500/5 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
        <BarChart className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-sm">Oylama Merkezi</h3>
        <p className="text-xs text-muted-foreground">Geçmiş & Yeni Oylamalar</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </div>

    <Link href="/dashboard/resources" className="group">
      <div className="h-full border border-border/50 bg-card rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/30 hover:bg-muted/30 transition-all cursor-pointer shadow-sm hover:shadow-md">
        <div className="p-3 bg-purple-500/5 text-purple-600 rounded-lg group-hover:scale-105 transition-transform">
          <Archive className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Kaynaklar</h3>
          <p className="text-xs text-muted-foreground">Dosyalar & Kılavuzlar</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  </div>
);

export default function CommitteePage() {
  const { data: session } = useSession();
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const role = session?.user?.role;
  const isManager = role === 'committee_chairman' || role === 'deputy_chair';

  const { data: managerData, isLoading: managerLoading } = useQuery({
    queryKey: ["manager-committee-stats"],
    queryFn: async () => {
      const res = await fetch("/api/committee/my-committee");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      if (session?.user && role === 'committee_chairman') {
        const chairmanUser = {
          id: "me-chairman",
          userId: session.user.id,
          full_name: session.user.name || "Ben (Başkan)",
          email: session.user.email || "",
          image: session.user.image, // Ensure current user image is used
          role: "committee_chairman",
          can_edit: true
        };
        if (!data.members.find((m: any) => m.userId === session.user.id)) {
          data.members = [chairmanUser, ...data.members];
        }
      }
      return data;
    },
    enabled: !!isManager
  });

  const { data: participantData, isLoading: participantLoading } = useQuery<CommitteeData | null>({
    queryKey: ["committee-data"],
    queryFn: async () => {
      const resMe = await fetch("/api/participant/me");
      if (!resMe.ok) throw new Error("Failed");
      const jsonMe = await resMe.json();

      if (!jsonMe.committeeMember) return null;

      const basicCommittee = jsonMe.committeeMember.committee;
      const adminUser = basicCommittee.admin;

      let members = jsonMe.committeeMembers || [];

      if (adminUser) {
        const chairmanMember = {
          ...adminUser, // Spread adminUser to capture user_details or image if present
          id: "chairman-" + adminUser.id,
          userId: adminUser.id,
          full_name: adminUser.full_name,
          email: adminUser.email,
          role: adminUser.role || "committee_chairman",
          can_edit: true
        };
        members = [chairmanMember, ...members.filter((m: any) => m.userId !== adminUser.id)];
      }

      return {
        committee: basicCommittee,
        topic: jsonMe.topic,
        can_write: jsonMe.committeeMember.can_write,
        committeeMembers: members,
        recentRollCalls: jsonMe.recentRollCalls
      };
    },
    enabled: !isManager,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = isManager ? managerLoading : participantLoading;
  const committee = isManager ? managerData : participantData?.committee;
  const topic = isManager ? (managerData?.topic || null) : participantData?.topic;
  const stats = managerData?.stats;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-96 w-full lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 w-full lg:col-span-1 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!committee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center border border-border">
          <Users className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold font-display">Komite Bulunamadı</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {isManager
              ? "Yönettiğiniz bir komite bulunamadı."
              : "Henüz bir komiteye atanmamış olabilirsiniz."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Panele Dön</Link>
        </Button>
      </div>
    );
  }

  // Strictly typed members access
  const members: CommitteeMember[] = isManager
    ? (managerData as any)?.members || []
    : participantData?.committeeMembers || [];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-20 space-y-6">
      <Breadcrumbs items={[{ label: "Komitem" }]} />

      <CommitteeHero
        name={committee.name}
        description={committee.description}
        role={role || 'applicant'}
      >
        <SessionInfoPanel isManager={isManager} stats={stats} />
      </CommitteeHero>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8 order-1">
          <TopicCard topic={topic} />

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">
              Hızlı İşlemler
            </h3>
            <QuickActions onOpenVoting={() => setIsVotingOpen(true)} />
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-6 lg:self-start order-2">
          {/* Active Poll Widget: Only shows if there is an active poll */}
          <VotingSystem
            committeeId={committee.id}
            isChairman={isManager}
            userId={session?.user?.id || ""}
            variant="sidebar"
          />

          <MembersWidget members={members} />

          {isManager && (
            <>
              <RollCallHistory variant="compact" />
              <Button asChild className="w-full bg-background hover:bg-muted text-foreground border border-border/50 shadow-sm" variant="outline">
                <Link href="/dashboard/committee/roll-call">
                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                  Yoklama Yönetimi
                </Link>
              </Button>
            </>
          )}
        </aside>
      </div>

      {/* Full Voting Management Modal */}
      <Dialog open={isVotingOpen} onOpenChange={setIsVotingOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
          <ScrollArea className="flex-1 p-6">
            <VotingSystem
              committeeId={committee.id}
              isChairman={isManager}
              userId={session?.user?.id || ""}
              variant="full"
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Change Log:
// - Updated `getUserData` in `MembersWidget` to correctly extract profile pictures from `user_details`, aligning with how data is stored.
// - Added `className="object-cover"` to `AvatarImage` in `MembersWidget` to correct aspect ratio issues.
// - Explicitly added `image: session.user.image` to the constructed chairman user object in `managerData` query to ensure the current user's avatar displays correctly.
// - Spread `adminUser` props in `participantData` query to ensure any available `user_details` are passed to the member object.