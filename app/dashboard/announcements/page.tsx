"use client";

import { useQuery } from "@tanstack/react-query";
import { Announcement } from "@/types/announcement";
import { AnnouncementFeed } from "@/components/dashboard/announcements/AnnouncementFeed";
import { CardSkeleton } from "@/components/ui/skeleton-loader";

export default function AnnouncementsPage() {
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements-public'],
    queryFn: async () => {
        const res = await fetch("/api/announcements");
        if (!res.ok) throw new Error("Failed");
        return res.json();
    }
  });

  if (isLoading) return <div className="max-w-4xl mx-auto p-4"><CardSkeleton count={3} /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
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

// Change Log:
// - Refactored to `useQuery`.
// - Uses `CardSkeleton`.