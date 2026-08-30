// components/dashboard/announcements/AnnouncementsView.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import { Announcement } from "@/types/announcement";
import { AnnouncementFeed } from "@/components/dashboard/announcements/AnnouncementFeed";
import { ListSkeleton } from "@/components/ui/skeleton-loader";
import { Skeleton } from "@/components/ui/skeleton";

export function AnnouncementsView() {
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
            <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <ListSkeleton count={3} />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-5 animate-fade-in sm:p-8">
            <div>
                <p className="text-sm text-[#C4B5FD]">Stay informed</p>
                <h1 className="mt-2 text-3xl font-semibold text-[#F5F3FF]">Announcements</h1>
                <p className="mt-2 text-[#9CA3AF]">Important updates from the RavenMUN team and committees.</p>
            </div>

            <AnnouncementFeed announcements={announcements} />
        </div>
    );
}
