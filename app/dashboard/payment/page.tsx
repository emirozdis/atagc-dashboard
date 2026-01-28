"use client";

import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PaymentUploadForm } from "@/components/dashboard/payment/PaymentUploadForm";
import { Card, CardContent } from "@/components/ui/card";
import {
    CheckCircle2, Clock, ExternalLink, FileText, Wallet,
    Copy, AlertTriangle, Ban, CreditCard, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PaymentStatusEnum } from "@/types/payment";
import { SystemSettings } from "@/types/dashboard";

export default function PaymentPage() {
    const { data: statusData, isLoading: statusLoading } = useQuery({
        queryKey: ['payment-status'],
        queryFn: async () => {
            const res = await fetch("/api/payment/status");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    const { data: settings, isLoading: settingsLoading } = useQuery<SystemSettings>({
        queryKey: ['public-settings'],
        queryFn: async () => {
            const res = await fetch("/api/settings");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    const isLoading = statusLoading || settingsLoading;

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto space-y-8 pb-12">
                <Skeleton className="h-4 w-48 mb-6" />
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    const status = statusData?.payment_status || PaymentStatusEnum.UNPAID;
    const receipt = statusData?.last_receipt;
    const amount = statusData?.amount_required || 0;

    const isPaid = status === PaymentStatusEnum.PAID;
    const isProcessing = status === PaymentStatusEnum.PROCESSING;
    const isRejected = status === PaymentStatusEnum.REJECTED;
    const isExempt = status === PaymentStatusEnum.EXEMPT;
    const isUnpaid = status === PaymentStatusEnum.UNPAID;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Kopyalandı");
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            <Breadcrumbs items={[{ label: "Panel", href: "/dashboard" }, { label: "Ödeme" }]} />

            {/* Header */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-3xl font-display font-bold">Ödeme ve Kayıt</h2>
                    <p className="text-muted-foreground mt-1">Etkinlik katılım ücretini tamamlayın.</p>
                </div>

                {!isExempt && (
                    <div className="flex items-center justify-between relative max-w-lg mx-auto md:mx-0 md:max-w-none">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-secondary -z-10 rounded-full" />
                        <div className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-700",
                            isPaid ? "w-full" : isProcessing ? "w-2/3" : isRejected ? "w-1/3 bg-red-500" : "w-1/6"
                        )} />

                        <StepNumber active step={1} label="Banka" />
                        <StepNumber active={!isUnpaid} step={2} label="Dekont" />
                        <StepNumber
                            active={isProcessing || isPaid || isRejected}
                            step={3}
                            label="Onay"
                            error={isRejected}
                        />
                    </div>
                )}
            </div>

            {/* Status Card */}
            <Card className={cn(
                "border-l-4 shadow-sm transition-all duration-300 overflow-hidden",
                isExempt ? "border-purple-500 bg-purple-500/5" :
                    isPaid ? "border-emerald-500 bg-emerald-500/5" :
                        isRejected ? "border-red-500 bg-red-500/5" :
                            isProcessing ? "border-amber-500 bg-amber-500/5" :
                                "border-primary bg-card"
            )}>
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className={cn(
                            "p-4 rounded-full shrink-0 border-4",
                            isExempt ? "bg-purple-500/20 text-purple-600 border-purple-500/10" :
                                isPaid ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/10" :
                                    isRejected ? "bg-red-500/20 text-red-600 border-red-500/10" :
                                        isProcessing ? "bg-amber-500/20 text-amber-600 border-amber-500/10" :
                                            "bg-primary/10 text-primary border-primary/5"
                        )}>
                            {isExempt ? <ShieldCheck className="w-8 h-8" /> :
                                isPaid ? <CheckCircle2 className="w-8 h-8" /> :
                                    isRejected ? <AlertTriangle className="w-8 h-8" /> :
                                        isProcessing ? <Clock className="w-8 h-8 animate-pulse" /> :
                                            <Wallet className="w-8 h-8" />}
                        </div>
                        <div className="space-y-1 flex-1">
                            <h3 className={cn(
                                "text-2xl font-bold tracking-tight",
                                isExempt ? "text-purple-700 dark:text-purple-400" :
                                    isPaid ? "text-emerald-700 dark:text-emerald-400" :
                                        isRejected ? "text-red-700 dark:text-red-400" :
                                            isProcessing ? "text-amber-700 dark:text-amber-400" :
                                                "text-foreground"
                            )}>
                                {isExempt ? "Ödemeden Muaf" :
                                    isPaid ? "Ödeme Onaylandı" :
                                        isRejected ? "Ödeme Reddedildi" :
                                            isProcessing ? "İnceleniyor" :
                                                "Ödeme Bekleniyor"}
                            </h3>
                            <p className="text-base text-muted-foreground/90 leading-relaxed">
                                {isExempt ? "Rolünüz veya başvurunuz gereği katılım ücretinden muaf tutuldunuz. Herhangi bir işlem yapmanıza gerek yoktur." :
                                    isPaid ? "Ödemeniz başarıyla alınmış ve kaydınız kesinleşmiştir." :
                                        isRejected ? "Yüklediğiniz dekont onaylanamadı. Lütfen yeni bir dekont yükleyiniz." :
                                            isProcessing ? "Dekontunuz finans ekibimiz tarafından incelenmektedir." :
                                                "Lütfen katılım ücretini aşağıda belirtilen hesaba yatırınız."}
                            </p>
                        </div>
                    </div>
                    {isRejected && receipt?.admin_note && (
                        <div className="mt-6 bg-background/80 border border-red-500/20 p-4 rounded-lg text-sm text-foreground">
                            <div className="flex items-center gap-2 mb-2 text-red-600 font-semibold"><AlertTriangle className="w-4 h-4" /> Red Sebebi</div>
                            {receipt.admin_note}
                        </div>
                    )}
                </CardContent>
            </Card>

            {!isExempt && (
                <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Bank Info */}
                    {!isPaid && !isProcessing && (
                        <div className="relative group">
                            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
                                <div className="bg-zinc-900 text-white p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-2 font-mono text-sm tracking-widest uppercase">
                                        <CreditCard className="w-4 h-4 text-primary" /> Banka Transferi
                                    </div>
                                </div>
                                <div className="p-6 md:p-8 space-y-6">
                                    <div className="grid gap-10 md:grid-cols-3">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Alıcı</span>
                                            <div className="font-bold text-lg">{settings?.bank_account_holder || "ATAGÇ Komitesi"}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Banka</span>
                                            <div className="font-bold text-lg">{settings?.bank_name || "Ziraat Bankası"}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tutar</span>
                                            <div className="font-bold text-xl text-primary">{amount.toLocaleString('tr-TR')} ₺</div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">IBAN</span>
                                        <div
                                            className="bg-secondary/30 border border-border/50 p-4 rounded-xl font-mono text-base md:text-xl flex justify-between items-center cursor-pointer hover:bg-secondary/50 transition-colors"
                                            onClick={() => copyToClipboard(settings?.bank_iban || "")}
                                        >
                                            <span className="break-all">{settings?.bank_iban || "IBAN Bilgisi Yok"}</span>
                                            <Button size="icon" variant="ghost"><Copy className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Upload */}
                    {(isUnpaid || isRejected) && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-lg font-semibold">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">2</div>
                                Dekont Yükle
                            </div>
                            <PaymentUploadForm />
                        </div>
                    )}

                    {/* Receipt View */}
                    {(isProcessing || isPaid || isRejected) && receipt?.file_url && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-lg font-semibold">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold"><FileText className="w-4 h-4" /></div>
                                {isPaid ? "Arşivlenmiş Dekont" : "Yüklenen Dosya"}
                            </div>
                            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex justify-between items-center">
                                    <span className="text-xs font-mono text-muted-foreground uppercase">{new Date(receipt.created_at).toLocaleString("tr-TR")}</span>
                                </div>
                                <div className="p-0 bg-zinc-950/5 min-h-[300px] flex items-center justify-center relative group">
                                    {receipt.file_type === 'application/pdf' ? (
                                        <iframe src={`${receipt.file_url}#toolbar=0`} className="w-full h-[500px] bg-white" />
                                    ) : (
                                        <img src={receipt.file_url} className="max-h-[500px] w-auto object-contain" alt="Dekont" />
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                        <Button variant="secondary" asChild>
                                            <a href={receipt.file_url} target="_blank"><ExternalLink className="w-4 h-4 mr-2" /> Tam Boyut</a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StepNumber({ step, label, active, error }: { step: number, label: string, active: boolean, error?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-2 bg-background p-2 rounded-xl min-w-[60px]">
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                error ? "bg-red-500 text-white" :
                    active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
                {error ? <Ban className="w-4 h-4" /> : step}
            </div>
            <span className="text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
        </div>
    );
}