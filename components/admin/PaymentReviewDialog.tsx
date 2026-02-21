"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Loader2, CheckCircle, XCircle, FileText, ExternalLink,
    User, Phone, GraduationCap, MapPin, Calendar, Hash, UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PaymentReviewDialogProps {
    paymentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PaymentReviewDialog({ paymentId, open, onOpenChange }: PaymentReviewDialogProps) {
    const queryClient = useQueryClient();
    const [rejectReason, setRejectReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

    const { data: payment, isLoading } = useQuery({
        queryKey: ['payment-detail', paymentId],
        queryFn: async () => {
            const res = await fetch(`/api/admin/payments/review?id=${paymentId}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!paymentId && open
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ action, note }: { action: 'approve' | 'reject', note?: string }) => {
            const res = await fetch("/api/admin/payments/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ receiptId: paymentId, action, note })
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            toast.success("İşlem Başarılı");
            queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
            queryClient.invalidateQueries({ queryKey: ['admin-payments-stats'] });
            onOpenChange(false);
            setIsRejecting(false);
            setRejectReason("");
        },
        onError: () => toast.error("Bir hata oluştu")
    });

    if (!paymentId) return null;

    // Safe Accessor for User Details
    const userDetails = payment?.user?.user_details
        ? (Array.isArray(payment.user.user_details) ? payment.user.user_details[0] : payment.user.user_details)
        : null;

    const additional = userDetails?.additional_info || {};

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">

                    {/* Left: Preview */}
                    <div className="flex-1 bg-zinc-950/5 flex flex-col items-center justify-center p-4 border-r border-border/50 overflow-hidden relative min-h-[300px] md:min-h-full">
                        {isLoading ? (
                            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                        ) : payment?.file_url ? (
                            payment.file_type === 'application/pdf' ? (
                                <iframe src={payment.file_url} className="w-full h-full rounded-lg bg-white shadow-sm border border-border/50" />
                            ) : (
                                <img src={payment.file_url} alt="Receipt" className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-lg border border-border/50 bg-white" />
                            )
                        ) : (
                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                                <FileText className="w-12 h-12 opacity-50" />
                                <span>Dosya görüntülenemiyor</span>
                            </div>
                        )}

                        {payment?.file_url && (
                            <div className="absolute bottom-6 right-6 flex gap-2">
                                <Button variant="secondary" size="sm" className="shadow-lg backdrop-blur-md bg-background/80" asChild>
                                    <a href={payment.file_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3 h-3 mr-2" /> Yeni Sekmede Aç
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Right: Info & Actions */}
                    <div className="w-full md:w-[400px] bg-background flex flex-col border-t md:border-t-0 md:border-l border-border/50 shrink-0">
                        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/5">
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Ödeme İnceleme
                            </DialogTitle>
                        </DialogHeader>

                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-8">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        <div className="h-12 bg-muted animate-pulse rounded-lg w-full" />
                                        <div className="h-24 bg-muted animate-pulse rounded-lg w-full" />
                                        <div className="h-24 bg-muted animate-pulse rounded-lg w-full" />
                                    </div>
                                ) : (
                                    <>
                                        {/* User Profile Section */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <User className="w-3.5 h-3.5" /> Başvuru Sahibi
                                            </h4>

                                            <div className="bg-secondary/10 border border-border/50 rounded-xl p-4 space-y-3">
                                                <div>
                                                    <div className="font-bold text-lg text-foreground">{payment.user.full_name}</div>
                                                    <div className="text-sm text-muted-foreground">{payment.user.email}</div>
                                                </div>

                                                <Separator className="bg-border/50" />

                                                <div className="grid gap-3 text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <Phone className="w-4 h-4 text-primary/70 shrink-0" />
                                                        <span className="text-foreground/90">{userDetails?.phone_number || "Telefon Yok"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <GraduationCap className="w-4 h-4 text-primary/70 shrink-0" />
                                                        <div className="text-foreground/90">
                                                            <span className="line-clamp-1" title={(userDetails as any)?.high_schools?.school_name || additional?.manual_school_name}>
                                                                {(userDetails as any)?.high_schools?.school_name || additional?.manual_school_name || "Okul Yok"}
                                                            </span>
                                                            {additional.grade && <span className="text-muted-foreground text-xs block mt-0.5">{additional.grade}. Sınıf</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
                                                        <span className="text-foreground/90">
                                                            {additional.city || "Şehir Belirtilmemiş"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transaction Details */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <Hash className="w-3.5 h-3.5" /> İşlem Detayları
                                            </h4>

                                            <div className="bg-card border border-border/50 rounded-xl p-4 space-y-4 shadow-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-muted-foreground">Durum</span>
                                                    {payment.status === 'approved' && <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Onaylı</Badge>}
                                                    {payment.status === 'rejected' && <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Reddedildi</Badge>}
                                                    {payment.status === 'pending' && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Beklemede</Badge>}
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" /> Yükleme
                                                    </span>
                                                    <span className="text-sm font-medium">{new Date(payment.created_at).toLocaleString("tr-TR")}</span>
                                                </div>

                                                {payment.reviewer && (
                                                    <div className="flex justify-between items-start pt-2 border-t border-border/50">
                                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                                            <UserCheck className="w-3.5 h-3.5" /> İnceleyen
                                                        </span>
                                                        <div className="text-right">
                                                            <div className="text-sm font-medium">{payment.reviewer.full_name}</div>
                                                            {payment.reviewed_at && (
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {new Date(payment.reviewed_at).toLocaleString("tr-TR")}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {payment.admin_note && (
                                                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-sm mt-2">
                                                        <span className="font-semibold text-red-600 block mb-1 text-xs uppercase">Red Sebebi</span>
                                                        <p className="text-foreground/80 leading-relaxed">{payment.admin_note}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Action Footer */}
                        {payment?.status === 'pending' && (
                            <div className="p-4 border-t border-border/50 bg-muted/5 space-y-3">
                                {isRejecting ? (
                                    <div className="space-y-3 animate-in slide-in-from-bottom-2 fade-in">
                                        <Label className="text-red-600">Reddetme Sebebi</Label>
                                        <Textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Örn: Dekont okunamıyor, tutar hatalı..."
                                            className="min-h-[80px] bg-background focus:border-red-500/50"
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => setIsRejecting(false)}>İptal</Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={!rejectReason.trim() || reviewMutation.isPending}
                                                onClick={() => reviewMutation.mutate({ action: 'reject', note: rejectReason })}
                                            >
                                                {reviewMutation.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                                Reddet ve Bildir
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-700 hover:border-red-500/50"
                                            onClick={() => setIsRejecting(true)}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" /> Reddet
                                        </Button>
                                        <Button
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-900/10"
                                            onClick={() => reviewMutation.mutate({ action: 'approve' })}
                                            disabled={reviewMutation.isPending}
                                        >
                                            {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                            Onayla
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Change Log:
// - Moved `grade` info next to the School name in the layout.
// - Added `reviewed_at` date and `UserCheck` icon to the "İnceleyen" section in Transaction Details.