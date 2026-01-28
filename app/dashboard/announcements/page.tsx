"use client";

import { useQuery } from "@tanstack/react-query";
import { Announcement } from "@/types/announcement";
import { AnnouncementFeed } from "@/components/dashboard/announcements/AnnouncementFeed";
import { CardSkeleton, ListSkeleton } from "@/components/ui/skeleton-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function AnnouncementsPage() {
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements-public'],
    queryFn: async () => {
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <ListSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Duyurular" }]} />
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Duyurular</h2>
        <p className="text-muted-foreground mt-1">
          Etkinlik ve komiteler hakkında güncel bilgiler.
        </p>
      </div>

      <AnnouncementFeed announcements={announcements} />
    </div>
  );
}