"use client";

import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PaymentUploadForm } from "@/components/dashboard/payment/PaymentUploadForm";
import { Card, CardContent } from "@/components/ui/card";
import {
    CheckCircle2, Clock, ExternalLink, FileText, Download, Wallet,
    Copy, AlertTriangle, Ban, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PaymentPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['payment-status'],
        queryFn: async () => {
            const res = await fetch("/api/payment/status");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        // No refetchInterval (Polling removed)
    });

    // Realtime subscription removed per request.

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto space-y-8 p-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    const status = data?.payment_status || 'unpaid';
    const receipt = data?.last_receipt;
    const amount = data?.amount_required || 0;

    const isPaid = status === 'paid';
    const isProcessing = status === 'processing';
    const isRejected = status === 'rejected';
    const isUnpaid = status === 'unpaid';

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Kopyalandı", { position: "bottom-center" });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-20">
            <Breadcrumbs items={[{ label: "Panel", href: "/dashboard" }, { label: "Ödeme" }]} />

            {/* Header & Status Indicator */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-3xl font-display font-bold">Ödeme ve Kayıt</h2>
                    <p className="text-muted-foreground mt-1">Etkinlik katılım ücretini tamamlayın.</p>
                </div>

                {/* Process Stepper */}
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-secondary -z-10 rounded-full" />
                    <div className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-700",
                        isPaid ? "w-full" : isProcessing ? "w-2/3" : isRejected ? "w-1/3 bg-red-500" : "w-1/6"
                    )} />

                    {/* Step 1: Info */}
                    <div className="flex flex-col items-center gap-2 bg-background p-2 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                        <span className="text-[10px] font-medium uppercase tracking-wider">Banka</span>
                    </div>

                    {/* Step 2: Upload */}
                    <div className="flex flex-col items-center gap-2 bg-background p-2 rounded-xl">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                            !isUnpaid ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        )}>2</div>
                        <span className={cn("text-[10px] font-medium uppercase tracking-wider", isUnpaid && "text-muted-foreground")}>Dekont</span>
                    </div>

                    {/* Step 3: Review */}
                    <div className="flex flex-col items-center gap-2 bg-background p-2 rounded-xl">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                            (isProcessing || isPaid || isRejected) ? (isRejected ? "bg-red-500 text-white" : "bg-primary text-primary-foreground") : "bg-secondary text-muted-foreground"
                        )}>
                            {isRejected ? <Ban className="w-4 h-4" /> : "3"}
                        </div>
                        <span className={cn("text-[10px] font-medium uppercase tracking-wider", (isUnpaid && !isRejected) && "text-muted-foreground")}>Onay</span>
                    </div>
                </div>
            </div>

            {/* Main Status Card */}
            <Card className={cn(
                "border-l-4 shadow-sm transition-all duration-300 overflow-hidden",
                isPaid ? "border-emerald-500 bg-emerald-500/5" :
                    isRejected ? "border-red-500 bg-red-500/5" :
                        isProcessing ? "border-amber-500 bg-amber-500/5" :
                            "border-primary bg-card"
            )}>
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className={cn(
                            "p-4 rounded-full shrink-0 border-4",
                            isPaid ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/10" :
                                isRejected ? "bg-red-500/20 text-red-600 border-red-500/10" :
                                    isProcessing ? "bg-amber-500/20 text-amber-600 border-amber-500/10" :
                                        "bg-primary/10 text-primary border-primary/5"
                        )}>
                            {isPaid ? <CheckCircle2 className="w-8 h-8" /> :
                                isRejected ? <AlertTriangle className="w-8 h-8" /> :
                                    isProcessing ? <Clock className="w-8 h-8 animate-pulse" /> :
                                        <Wallet className="w-8 h-8" />}
                        </div>
                        <div className="space-y-1 flex-1">
                            <h3 className={cn(
                                "text-2xl font-bold tracking-tight",
                                isPaid ? "text-emerald-700 dark:text-emerald-400" :
                                    isRejected ? "text-red-700 dark:text-red-400" :
                                        isProcessing ? "text-amber-700 dark:text-amber-400" :
                                            "text-foreground"
                            )}>
                                {isPaid ? "Ödeme Onaylandı" :
                                    isRejected ? "Ödeme Reddedildi" :
                                        isProcessing ? "İnceleniyor" :
                                            "Ödeme Bekleniyor"}
                            </h3>
                            <p className="text-base text-muted-foreground/90 leading-relaxed">
                                {isPaid ? "Ödemeniz başarıyla alınmış ve kaydınız kesinleşmiştir. Etkinlik günü QR kodunuz ile giriş yapabilirsiniz." :
                                    isRejected ? "Yüklediğiniz dekont incelendi ancak onaylanamadı. Lütfen aşağıdaki notu okuyarak yeni bir dekont yükleyiniz." :
                                        isProcessing ? "Dekontunuz finans ekibimiz tarafından incelenmektedir. Bu işlem genellikle 24 saat içinde tamamlanır." :
                                            "Lütfen katılım ücretini aşağıda belirtilen banka hesabına yatırınız ve dekontu sisteme yükleyiniz."}
                            </p>
                        </div>
                    </div>

                    {isRejected && receipt?.admin_note && (
                        <div className="mt-6 bg-background/80 border border-red-500/20 p-4 rounded-lg shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-2 text-red-600 font-semibold text-sm">
                                <AlertTriangle className="w-4 h-4" /> Red Sebebi
                            </div>
                            <p className="text-sm text-foreground">{receipt.admin_note}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Content Area: Bank Info OR Receipt Preview */}
            <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Bank Ticket (Only if not paid) */}
                {!isPaid && (
                    <div className="relative group">
                        <div className="relative bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
                            {/* Ticket Header */}
                            <div className="bg-zinc-900 text-white p-4 flex justify-between items-center">
                                <div className="flex items-center gap-2 font-mono text-sm tracking-widest uppercase">
                                    <CreditCard className="w-4 h-4 text-primary" /> Banka Transferi
                                </div>
                            </div>

                            {/* Ticket Body */}
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="grid gap-10 md:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Alıcı Adı</span>
                                        <div className="font-bold text-lg">ATAGÇ Organizasyon Komitesi</div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Banka</span>
                                        <div className="font-bold text-lg">Ziraat Bankası</div>
                                    </div>
                                    <div className="space-y-1.5">

                                        {amount > 0 && (
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tutar</span>
                                                <div className="font-bold text-xl text-primary">{amount.toLocaleString('tr-TR')} ₺</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">IBAN</span>
                                    <div
                                        className="bg-secondary/30 border border-border/50 p-4 rounded-xl font-mono text-base md:text-xl tracking-wide flex justify-between items-center group/iban cursor-pointer hover:bg-secondary/50 transition-colors"
                                        onClick={() => copyToClipboard("TR00 0000 0000 0000 0000 0000 00")}
                                    >
                                        <span className="break-all">TR00 0000 0000 0000 0000 0000 00</span>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground group-hover/iban:text-primary">
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Area (If Unpaid/Rejected) */}
                {(isUnpaid || isRejected) && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">2</div>
                            Dekont Yükle
                        </div>
                        <PaymentUploadForm />
                    </div>
                )}

                {/* Receipt Display (If Processing/Paid/Rejected) */}
                {(isProcessing || isPaid || isRejected) && receipt?.file_url && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                                <FileText className="w-4 h-4" />
                            </div>
                            {isPaid ? "Arşivlenmiş Dekont" : "Yüklenen Dosya"}
                        </div>

                        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                            {/* Preview Header */}
                            <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex justify-between items-center">
                                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                                    {new Date(receipt.created_at).toLocaleString("tr-TR")}
                                </span>
                                <Badge variant="outline" className="bg-background text-[10px]">
                                    {receipt.file_type.split('/')[1].toUpperCase()}
                                </Badge>
                            </div>

                            {/* Preview Body */}
                            <div className="p-0 bg-zinc-950/5 min-h-[300px] flex items-center justify-center relative group">
                                {receipt.file_type === 'application/pdf' ? (
                                    <iframe
                                        src={`${receipt.file_url}#toolbar=0&navpanes=0`}
                                        className="w-full h-[500px] bg-white"
                                        title="Receipt Preview"
                                    />
                                ) : (
                                    <div className="w-full h-full p-4 flex items-center justify-center">
                                        <img
                                            src={receipt.file_url}
                                            alt="Receipt"
                                            className="max-h-[500px] w-auto object-contain rounded-lg shadow-sm bg-white"
                                        />
                                    </div>
                                )}

                                {/* Hover Overlay for Actions */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                    <Button variant="secondary" asChild>
                                        <a href={receipt.file_url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-4 h-4 mr-2" /> Tam Boyut
                                        </a>
                                    </Button>
                                    <Button variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10" asChild>
                                        <a href={receipt.file_url} download>
                                            <Download className="w-4 h-4 mr-2" /> İndir
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

// Change Log:
// - Removed `useSupabaseRealtime` import and hook usage.
// - Removed `useEffect` that set up the Realtime subscription.
// - Removed `refetchInterval` logic from `useQuery`.
// - Removed `useSession` import as it was only used for the subscription ID.