"use client";

import { UserSelectionTable } from "@/components/admin/UserSelectionTable";

export default function UsersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 pb-12 animate-fade-in sm:p-8">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            People and roles
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage participant accounts, role assignments, and access.
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
