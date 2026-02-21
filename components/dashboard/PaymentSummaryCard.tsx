"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, AlertCircle, Clock, CreditCard } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export function PaymentSummaryCard() {
    const { data, isLoading } = useQuery({
        queryKey: ['payment-status'],
        queryFn: async () => {
            const res = await fetch("/api/payment/status");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    if (isLoading) return <Skeleton className="h-[80px] w-full rounded-xl" />;

    const status = data?.payment_status || 'unpaid';

    const getStatusConfig = () => {
        switch (status) {
            case 'paid':
                return {
                    label: "Ödeme Onaylandı",
                    icon: CheckCircle2,
                    color: "text-emerald-600",
                    bg: "bg-emerald-500/10",
                    border: "border-emerald-500/20",
                    desc: "Kaydınız tamamlandı."
                };
            case 'processing':
                return {
                    label: "İnceleniyor",
                    icon: Clock,
                    color: "text-amber-600",
                    bg: "bg-amber-500/10",
                    border: "border-amber-500/20",
                    desc: "Dekont kontrol ediliyor."
                };
            case 'rejected':
                return {
                    label: "Reddedildi",
                    icon: AlertCircle,
                    color: "text-red-600",
                    bg: "bg-red-500/10",
                    border: "border-red-500/20",
                    desc: "Lütfen kontrol ediniz."
                };
            default:
                return {
                    label: "Ödeme Bekleniyor",
                    icon: CreditCard,
                    color: "text-primary",
                    bg: "bg-secondary/50",
                    border: "border-border",
                    desc: "Dekont yükleyiniz."
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <Card className={`border ${config.border} shadow-sm bg-card hover:bg-muted/10 transition-colors`}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${config.bg} ${config.color}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className={`text-sm font-bold ${config.color}`}>{config.label}</div>
                        <div className="text-xs text-muted-foreground">{config.desc}</div>
                    </div>
                </div>

                <Button size="sm" variant="ghost" asChild className="shrink-0 h-8 text-xs">
                    <Link href="/dashboard/payment">
                        Detaylar <ArrowRight className="w-3 h-3 ml-1.5" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}