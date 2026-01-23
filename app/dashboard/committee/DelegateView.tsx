"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VotingSystem } from "@/components/committee/VotingSystem";
import { CommitteeHero } from "@/components/committee/CommitteeHero";
import { MembersWidget } from "@/components/committee/MembersWidget";
import { TopicCard } from "@/components/committee/TopicCard";
import { QuickActions } from "@/components/committee/QuickActions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { useState, useEffect } from "react";

export function DelegateView({ session }: { session: any }) {
  const [isVotingOpen, setIsVotingOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash.slice(1) === "voting") setIsVotingOpen(true);
  }, []);

  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["committee-context-me"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["committee-members-list"],
    queryFn: async () => {
      const res = await fetch("/api/committee/members");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!meData?.committeeMember
  });

  if (meLoading || membersLoading) return <LoadingSkeleton />;
  if (!meData?.committeeMember?.committee) return <EmptyState />;

  const committee = meData.committeeMember.committee;
  const topic = meData.topic;
  
  let members = membersData?.members || [];
  if (membersData?.admin && !members.find((m: any) => m.userId === membersData.admin.userId)) {
    members = [membersData.admin, ...members];
  }

  return (
    <>
      <CommitteeHero 
        name={committee.name} 
        description={committee.description} 
        role={session?.user?.role || 'applicant'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8 order-1">
          <TopicCard topic={topic} />
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Hızlı İşlemler</h3>
            <QuickActions onOpenVoting={() => setIsVotingOpen(true)} />
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-6 lg:self-start order-2">
          <VotingSystem 
            committeeId={committee.id} 
            isChairman={false} 
            userId={session?.user?.id || ""} 
            variant="sidebar" 
          />
          <MembersWidget members={members} isManager={false} />
        </aside>
      </div>

      <Dialog open={isVotingOpen} onOpenChange={setIsVotingOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
          <ScrollArea className="flex-1 p-6">
            <VotingSystem 
                committeeId={committee.id} 
                isChairman={false} 
                userId={session?.user?.id || ""} 
                variant="full" 
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-64 w-full rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="h-96 w-full lg:col-span-2 rounded-xl" />
        <Skeleton className="h-96 w-full lg:col-span-1 rounded-xl" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center border border-border">
        <Users className="w-10 h-10 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-2xl font-bold font-display">Henüz Atanmadınız</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Başvurunuz onaylanmış olsa da henüz bir komiteye yerleştirilmediniz.
        </p>
      </div>
      <Button asChild variant="outline"><Link href="/dashboard">Panele Dön</Link></Button>
    </div>
  );
}