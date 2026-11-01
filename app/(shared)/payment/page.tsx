"use client";

import { Suspense } from "react";
import { PaymentView } from "@/components/dashboard/payment/PaymentView";
import { Skeleton } from "@/components/ui/skeleton";

function PaymentFallback() {
    return (
        <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8" aria-label="Loading payment">
            <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-full max-w-md" />
            </div>
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
    );
}

export default function SharedPaymentPage() {
    return (
        <Suspense fallback={<PaymentFallback />}>
            <PaymentView />
        </Suspense>
    );
}
