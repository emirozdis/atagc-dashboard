"use client";

import {
  Users as UsersIcon,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { UserSelectionTable } from "@/components/admin/UserSelectionTable";

export default function UsersPage() {
  const breadcrumbItems = [
    { label: "Kullanıcılar" }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="w-8 h-8 text-primary" />
            Kullanıcı Yönetimi
          </h2>
          <p className="text-muted-foreground mt-1">
            Toplu işlemler ve detaylı kullanıcı yönetimi.
          </p>
        </div>
      </div>

      {/* Removed the large wrapping Card here to allow the component to manage its own layout */}
      <UserSelectionTable />
    </div>
  );
}

// Change Log:
// - Removed the outer `<Card>` wrapper.
// - The `UserSelectionTable` now handles the layout structure (Controls Bar + Data Table) directly, matching the Applications page style.