"use client";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { AnnouncementsView } from "@/components/dashboard/announcements/AnnouncementsView";

export default function SharedAnnouncementsPage() {
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Duyurular" }]} />
      <div className="mt-6">
        <AnnouncementsView />
      </div>
    </div>
  );
}