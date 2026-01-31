"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clock, Users, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VotingSystem } from "@/components/committee/VotingSystem";
import { RollCallHistory } from "@/components/committee/RollCallHistory";
import { CommitteeHero } from "@/components/committee/CommitteeHero";
import { MembersWidget } from "@/components/committee/MembersWidget";
import { SessionInfoPanel } from "@/components/committee/SessionInfoPanel";
import { TopicCard } from "@/components/committee/TopicCard";
import { useState } from "react";
import { CommitteeMemberDetailDialog } from "@/components/committee/CommitteeMemberDetailDialog";

export function ChairmanView({ session }: { session: any }) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["manager-committee-stats"],
    queryFn: async () => {
      const res = await fetch("/api/committee/my-committee");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState />;

  return (
    <>
      <CommitteeHero
        name={data.name}
        description={data.description}
        role={session?.user?.role || 'applicant'}
      >
        <SessionInfoPanel stats={data.stats} />
      </CommitteeHero>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8 order-1">
          <TopicCard topic={data.topic} />
          <VotingSystem
            committeeId={data.id}
            isChairman={true}
            userId={session?.user?.id || ""}
            variant="full"
          />
        </div>

        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-6 lg:self-start order-2">
          <MembersWidget
            members={data.members}
            isManager={true}
            onMemberClick={setSelectedMemberId}
          />
          <RollCallHistory variant="compact" />
          <Button asChild className="w-full bg-background hover:bg-muted text-foreground border border-border/50 shadow-sm" variant="outline">
            <Link href="/dashboard/committee/roll-call">
              <Clock className="w-4 h-4 mr-2 text-muted-foreground" /> Yoklama Yönetimi
            </Link>
          </Button>
        </aside>
      </div>

      <CommitteeMemberDetailDialog
        memberId={selectedMemberId}
        open={!!selectedMemberId}
        onOpenChange={(open) => !open && setSelectedMemberId(null)}
      />
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
          <Card className="min-h-[400px] border-border/50">
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>

        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-6 lg:self-start order-2">
          <MembersWidget isLoading={true} isManager={true} />
          <Card className="p-6 border-border/50">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
          <Skeleton className="h-10 w-full" />
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
        <h2 className="text-2xl font-bold font-display">Komite Bulunamadı</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Yönettiğiniz bir komite bulunamadı.
        </p>
      </div>
      <Button asChild variant="outline"><Link href="/dashboard">Panele Dön</Link></Button>
    </div>
  );
}