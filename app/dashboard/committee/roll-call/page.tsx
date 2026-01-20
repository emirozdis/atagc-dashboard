"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QrCode, Loader2, Info, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { RollCallHistory } from "@/components/committee/RollCallHistory";
import { DynamicRollCallQR } from "@/components/committee/DynamicRollCallQR";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CommitteeRollCallPage() {
  const [sessionName, setSessionName] = useState("");
  const [rollCallId, setRollCallId] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Queries
  const { data: committee } = useQuery({
    queryKey: ['my-committee'],
    queryFn: async () => {
      const res = await fetch("/api/committee/my-committee");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  // We fetch stats only for the final success screen here, live stats are handled by component
  const { data: finalStats } = useQuery({
    queryKey: ['roll-call-stats-final', rollCallId],
    queryFn: async () => {
      const res = await fetch(`/api/roll-call/${rollCallId}/stats`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isCompleted && !!rollCallId
  });

  const queryClient = useQueryClient();

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!sessionName) throw new Error("Oturum adı giriniz");

      const res = await fetch("/api/roll-call/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_name: sessionName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setRollCallId(data.id);
      setSecretKey(data.secret_key); 
      setIsCompleted(false);
      toast.success("Oturum Başlatıldı");
      queryClient.invalidateQueries({ queryKey: ["committee-roll-call-history"] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const triggerManualFinish = () => {
    setShowFinishConfirm(true);
  };

  const confirmManualFinish = () => {
    setIsCompleted(true);
    setShowFinishConfirm(false);
    toast.info("Yoklama manuel olarak sonlandırıldı.");
  };

  const handleClose = () => {
    setRollCallId(null);
    setSecretKey(null);
    setSessionName("");
    setIsCompleted(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
      <Breadcrumbs items={[{ label: "Komitem", href: "/dashboard/committee" }, { label: "Yoklama" }]} />
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Yoklama Oluştur</h2>
        <p className="text-muted-foreground mt-1">
          Komiteniz için dinamik QR kod oluşturun.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle>Oturum Bilgileri</CardTitle>
            <CardDescription>Aktif oturum için bir isim giriniz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-sm text-primary flex gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                {committee?.name ? (
                  <>Yoklama <span className="font-bold">{committee.name}</span> komitesine atanacaktır.</>
                ) : (
                  "Oluşturulan QR kod otomatik olarak yöneticisi olduğunuz komiteye atanacaktır."
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Oturum Adı</Label>
              <Input
                placeholder="Örn: 1. Oturum, Sabah Oturumu"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                disabled={!!rollCallId && !isCompleted}
              />
            </div>

            {!rollCallId && (
              <Button onClick={() => createMutation.mutate()} className="w-full mt-4" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                Başlat
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 flex flex-col items-center justify-center p-6 min-h-[300px]">
          {isCompleted ? (
            /* Success / Summary Screen */
            <div className="text-center space-y-6 animate-in zoom-in fade-in w-full py-6">
              <div className="flex justify-center mb-2">
                <div className="p-4 bg-green-500/20 text-green-500 rounded-full ring-4 ring-green-500/10">
                  <CheckCircle className="w-16 h-16" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-2xl text-green-500">Yoklama Tamamlandı</h3>
                <p className="text-muted-foreground font-medium text-lg">{sessionName}</p>
              </div>

              {finalStats && (
                <div className="bg-secondary/30 border border-border/50 rounded-xl p-6 max-w-xs mx-auto">
                  <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-2">Katılım Durumu</div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">{finalStats.scanned}</span>
                    <span className="text-xl text-muted-foreground">/ {finalStats.total}</span>
                  </div>
                </div>
              )}

              <Button size="lg" onClick={handleClose} className="w-full max-w-xs">
                Tamam
              </Button>
            </div>
          ) : (rollCallId && secretKey) ? (
            /* Active QR Screen via Component */
            <DynamicRollCallQR
              rollCallId={rollCallId}
              secretKey={secretKey}
              sessionName={sessionName}
              onManualFinish={triggerManualFinish}
              onComplete={() => setIsCompleted(true)}
            />
          ) : (
            /* Empty State */
            <div className="text-center text-muted-foreground">
              <QrCode className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>QR kod burada görüntülenecektir.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="pt-6">
        <RollCallHistory variant="full" />
      </div>

      <AlertDialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yoklamayı Bitir</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem yoklamayı manuel olarak sonlandıracaktır. QR kod geçersiz hale gelecektir ve yeni katılım kabul edilmeyecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmManualFinish} className="bg-destructive text-white hover:bg-destructive/90">
              Bitir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Change Log:
// - Replaced native `confirm()` with `AlertDialog` from `shadcn/ui`.
// - Added state `showFinishConfirm` to manage dialog visibility.