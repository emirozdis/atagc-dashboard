"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Loader2, Plus, Users, StopCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Committee {
  id: string;
  name: string;
}

interface CreateRollCallDialogProps {
    onSuccess: () => void;
}

type Step = 'form' | 'live' | 'success';

export function CreateRollCallDialog({ onSuccess }: CreateRollCallDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>('form');
    
    // Dialog control states for safe exit
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);

    // Form State
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [selectedCommittee, setSelectedCommittee] = useState<string>("");
    const [sessionName, setSessionName] = useState("");
    const [loading, setLoading] = useState(false);

    // Live State
    const [qrData, setQrData] = useState<string | null>(null);
    const [rollCallId, setRollCallId] = useState<string | null>(null);
    const [stats, setStats] = useState<{ scanned: number, total: number }>({ scanned: 0, total: 0 });
    
    const isCompletedRef = useRef(false);

    useEffect(() => {
        if (open && step === 'form') {
            fetchCommittees();
        }
    }, [open, step]);

    // Polling Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (open && step === 'live' && rollCallId) {
            const fetchStats = async () => {
                try {
                    const res = await fetch(`/api/roll-call/${rollCallId}/stats`);
                    if (res.ok) {
                        const data = await res.json();
                        setStats(data);

                        // Auto Finish
                        if (data.total > 0 && data.scanned >= data.total && !isCompletedRef.current) {
                            isCompletedRef.current = true;
                            setStep('success');
                            toast.success("Tüm üyeler katıldı, yoklama tamamlandı.");
                        }
                    }
                } catch (e) {
                    console.error("Stats polling error");
                }
            };

            fetchStats();
            interval = setInterval(fetchStats, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [open, step, rollCallId]);

    const fetchCommittees = async () => {
        try {
            const res = await fetch("/api/admin/committees");
            if (res.ok) {
                const data = await res.json();
                setCommittees(data);
            }
        } catch (e) {
            console.error("Failed to fetch committees");
        }
    };

    const generateQR = async () => {
        if (!selectedCommittee || !sessionName) {
            toast.error("Eksik Bilgi", { description: "Lütfen komite ve oturum adı seçiniz." });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/roll-call/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    committee_id: selectedCommittee,
                    session_name: sessionName,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
            }
            
            const data = await res.json();
            
            setQrData(data.qr_code);
            setRollCallId(data.id);
            setStats({ scanned: 0, total: 0 });
            isCompletedRef.current = false;
            
            toast.success("QR Kod Oluşturuldu");
            setStep('live');
        } catch (e) {
            toast.error("Hata", { description: "QR Kod oluşturulamadı." });
        } finally {
            setLoading(false);
        }
    };

    const handleManualFinishTrigger = () => {
        setShowFinishConfirm(true);
    };

    const confirmManualFinish = () => {
        setShowFinishConfirm(false);
        setStep('success');
    };

    const handleOpenChange = (val: boolean) => {
        if (!val && step === 'live') {
            setShowExitConfirm(true);
            return;
        }
        setOpen(val);
        if (!val) handleCloseCleanup();
    };

    const confirmExit = () => {
        setShowExitConfirm(false);
        setOpen(false);
        handleCloseCleanup();
    };

    const handleCloseCleanup = () => {
        // Reset state after transition effect
        setTimeout(() => {
            setStep('form');
            setSessionName("");
            setSelectedCommittee("");
            setQrData(null);
            setRollCallId(null);
            setStats({ scanned: 0, total: 0 });
            onSuccess(); // Refresh list
        }, 300);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Yoklama
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                    {step === 'form' && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Yeni Yoklama Oluştur</DialogTitle>
                                <DialogDescription>
                                    İstediğiniz komite için QR kod oluşturun.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Komite</Label>
                                    <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Komite Seçiniz" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {committees.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Oturum Adı</Label>
                                    <Input
                                        placeholder="Örn: 1. Oturum"
                                        value={sessionName}
                                        onChange={(e) => setSessionName(e.target.value)}
                                    />
                                </div>

                                <Button onClick={generateQR} className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                                    Oluştur
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 'live' && qrData && (
                        <div className="text-center space-y-6 py-2 animate-in fade-in zoom-in-95">
                            <DialogHeader>
                                <DialogTitle className="text-center">{sessionName}</DialogTitle>
                                <DialogDescription className="text-center">
                                    QR Kodu üyelere okutunuz.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex justify-center">
                                <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}&bgcolor=ffffff`} 
                                        alt="Session QR Code" 
                                        className="w-48 h-48 object-contain"
                                    />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="bg-secondary/20 border border-border/50 rounded-lg p-4 flex items-center justify-between gap-4 max-w-xs mx-auto w-full">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/20 text-primary rounded-full">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs text-muted-foreground">Anlık Katılım</div>
                                        <div className="font-mono font-bold text-lg">
                                            {stats.scanned} <span className="text-muted-foreground/60 text-sm">/ {stats.total}</span>
                                        </div>
                                    </div>
                                </div>
                                {stats.total > 0 && (
                                    <div className="h-10 w-10 relative flex items-center justify-center">
                                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                                            <path
                                                className="text-secondary"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="text-primary transition-all duration-500 ease-out"
                                                strokeDasharray={`${(stats.scanned / stats.total) * 100}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <Button variant="destructive" className="w-full" onClick={handleManualFinishTrigger}>
                                <StopCircle className="w-4 h-4 mr-2" />
                                Yoklamayı Bitir
                            </Button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in-95">
                            <div className="flex justify-center mb-2">
                                <div className="p-4 bg-green-500/20 text-green-500 rounded-full ring-4 ring-green-500/10">
                                    <CheckCircle className="w-16 h-16" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="font-bold text-2xl text-green-500">Yoklama Tamamlandı</h3>
                                <p className="text-muted-foreground font-medium text-lg">{sessionName}</p>
                            </div>

                            <div className="bg-secondary/30 border border-border/50 rounded-xl p-6 max-w-xs mx-auto">
                                <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-2">Katılım Durumu</div>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-bold text-foreground">{stats.scanned}</span>
                                    <span className="text-xl text-muted-foreground">/ {stats.total}</span>
                                </div>
                            </div>

                            <Button size="lg" onClick={() => setOpen(false)} className="w-full">
                                Tamam
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Exit Confirmation Dialog */}
            <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Yoklamadan Çıkılıyor</AlertDialogTitle>
                        <AlertDialogDescription>
                            Yoklama işlemi arka planda devam edecek ancak QR kodu göremeyeceksiniz. Pencereyi kapatmak istediğinize emin misiniz?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmExit}>Pencereyi Kapat</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             {/* Manual Finish Confirmation Dialog */}
             <AlertDialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Yoklamayı Bitir</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem yoklamayı manuel olarak sonlandıracaktır. QR kod geçersiz hale gelecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowFinishConfirm(false)}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmManualFinish} className="bg-destructive text-white hover:bg-destructive/90">Bitir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
// Change Log:
// - Removed browser `confirm()` calls.
// - Implemented `AlertDialog` for safe exit when closing the dialog during a live session.
// - Implemented `AlertDialog` for manually finishing the roll call.
// - Re-structured state handling to support these overlays.