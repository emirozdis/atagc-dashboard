"use client";

import { useSession } from "next-auth/react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ROLES } from "@/lib/roles";
import { ChairmanView } from "./ChairmanView";
import { DelegateView } from "./DelegateView";

export default function CommitteePage() {
  const { data: session } = useSession();

  const role = session?.user?.role;
  const isManager = role === ROLES.CHAIRMAN || role === ROLES.DEPUTY_CHAIR;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-6">
      <Breadcrumbs items={[{ label: "My committee" }]} />

      {isManager ? (
        <ChairmanView session={session} />
      ) : (
        <DelegateView session={session} />
      )}
    </div>
  );
}
