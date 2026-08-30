"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { DashboardData } from "@/types/dashboard";
import type { Session } from "next-auth";

interface CommitteeMemberSummary {
  id: string;
  userId: string;
  full_name: string;
  role: string;
  image?: string;
  user?: { role: string };
}

interface MembersResponse {
  members: CommitteeMemberSummary[];
  admin?: CommitteeMemberSummary | null;
}

export function DelegateView({ session }: { session: Session | null }) {
  const [isVotingOpen, setIsVotingOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash.slice(1) !== "voting") return;
    const frame = window.requestAnimationFrame(() => setIsVotingOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const { data: meData, isLoading: meLoading } = useQuery<DashboardData>({
    queryKey: ["committee-context-me"],
    queryFn: async () => {
      const res = await fetch("/api/participant/me");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: membersData, isLoading: membersLoading } = useQuery<MembersResponse>({
    queryKey: ["committee-members-list"],
    queryFn: async () => {
      const res = await fetch("/api/committee/members");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!meData?.committee
  });

  if (meLoading || membersLoading) return <LoadingSkeleton />;
  if (!meData?.committee) return <EmptyState />;

  const committee = meData.committee;
  const topic = committee.topic;

  let members = membersData?.members || [];
  if (membersData?.admin && !members.find((m) => m.userId === membersData.admin?.userId)) {
    members = [membersData.admin, ...members];
  }

  return (
    <>
      <CommitteeHero
        name={committee.name}
        description={committee.description || ""}
        role={session?.user?.role || 'applicant'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8 order-1">
          <TopicCard topic={topic} />
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Quick actions</h3>
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
      <CommitteeHero isLoading={true} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8 order-1">
          <TopicCard isLoading={true} />
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">Quick actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-6 lg:self-start order-2">
          <Card className="p-6 border-border/50">
            <Skeleton className="h-8 w-32 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
          <MembersWidget isLoading={true} />
        </aside>
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
        <h2 className="text-2xl font-bold font-display">No committee assigned yet</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Your application was approved, but you have not been placed in a committee yet.
        </p>
      </div>
      <Button asChild variant="outline"><Link href="/dashboard">Back to dashboard</Link></Button>
    </div>
  );
}
