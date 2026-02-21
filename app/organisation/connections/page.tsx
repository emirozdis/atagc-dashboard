"use client";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConnectionsView } from "@/components/dashboard/connections/ConnectionsView";

export default function OrganisationConnectionsPage() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <Breadcrumbs items={[{ label: "Organizasyon", href: "/organisation" }, { label: "Tanıştıklarım" }]} />
            <div className="mt-6">
                <ConnectionsView />
            </div>
        </div>
    );
}
