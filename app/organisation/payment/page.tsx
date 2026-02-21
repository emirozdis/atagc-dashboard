"use client";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PaymentView } from "@/components/dashboard/payment/PaymentView";

export default function OrganisationPaymentPage() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <Breadcrumbs items={[{ label: "Organizasyon", href: "/organisation" }, { label: "Ödeme" }]} />
            <div className="mt-6">
                <PaymentView />
            </div>
        </div>
    );
}
