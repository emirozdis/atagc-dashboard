"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { QrCode, RefreshCcw, Loader2, Info, Users, StopCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CommitteeRollCallPage() {
  const [sessionName, setSessionName] = useState("");
  const [qrData, setQrData] = useState<string | null>(null);
  const [rollCallId, setRollCallId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [committeeName, setCommitteeName] = useState<string>("");
  const [stats, setStats] = useState<{ scanned: number, total: number }>({ scanned: 0, total: 0 });
  const [isCompleted, setIsCompleted] = useState(false);

  // Use a ref to prevent race conditions in auto-closing
  const isCompletedRef = useRef(false);

  // Fetch committee info on mount
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch("/api/committee/my-committee");
        if (res.ok) {
          const data = await res.json();
          setCommitteeName(data.name || "");
        }
      } catch (e) {
        console.error("Failed to fetch committee info");
      }
    };
    fetchInfo();
  }, []);

  // Poll for stats when a roll call is active
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (rollCallId && !isCompleted) {
      const fetchStats = async () => {
        try {
          const res = await fetch(`/api/roll-call/${rollCallId}/stats`);
          if (res.ok) {
            const data = await res.json();
            setStats(data);

            // Automatic Finish Condition
            if (data.total > 0 && data.scanned >= data.total && !isCompletedRef.current) {
              isCompletedRef.current = true;
              setIsCompleted(true);
              toast.success("Tüm üyeler katıldı, yoklama tamamlandı.");
            }
          }
        } catch (e) {
          console.error("Stats polling error");
        }
      };

      // Initial fetch
      fetchStats();

      // Poll every 3 seconds
      interval = setInterval(fetchStats, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rollCallId, isCompleted]);

  const generateQR = async () => {
    if (!sessionName) {
      toast.error("Eksik Bilgi", { description: "Lütfen oturum adı giriniz." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/roll-call/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_name: sessionName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "İşlem başarısız");
      }

      const data = await res.json();

      setRollCallId(data.id);
      setQrData(data.qr_code);
      setStats({ scanned: 0, total: 0 });
      setIsCompleted(false);
      isCompletedRef.current = false;

      toast.success("QR Kod Oluşturuldu");
    } catch (e: any) {
      toast.error("Hata", { description: e.message || "QR Kod oluşturulamadı." });
    } finally {
      setLoading(false);
    }
  };

  const handleManualFinish = () => {
    if (!confirm("Yoklamayı bitirmek istediğinize emin misiniz?")) return;

    // Trigger success screen manually
    setIsCompleted(true);
    isCompletedRef.current = true;
    toast.info("Yoklama manuel olarak sonlandırıldı.");
  };

  const handleClose = () => {
    setQrData(null);
    setRollCallId(null);
    setStats({ scanned: 0, total: 0 });
    setSessionName("");
    setIsCompleted(false);
    isCompletedRef.current = false;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Yoklama Oluştur</h2>
        <p className="text-muted-foreground mt-1">
          Komiteniz için yoklama QR kodu oluşturun.
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
                {committeeName ? (
                  <>Yoklama <span className="font-bold">{committeeName}</span> komitesine atanacaktır.</>
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
                disabled={!!qrData}
              />
            </div>

            {!qrData && (
              <Button onClick={generateQR} className="w-full mt-4" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                QR Kod Oluştur
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

              <div className="bg-secondary/30 border border-border/50 rounded-xl p-6 max-w-xs mx-auto">
                <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-2">Katılım Durumu</div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-foreground">{stats.scanned}</span>
                  <span className="text-xl text-muted-foreground">/ {stats.total}</span>
                </div>
              </div>

              <Button size="lg" onClick={handleClose} className="w-full max-w-xs">
                Tamam
              </Button>
            </div>
          ) : qrData ? (
            /* Active QR Screen */
            <div className="text-center space-y-6 animate-in zoom-in fade-in w-full">
              <div className="bg-white p-4 rounded-xl shadow-lg inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}&bgcolor=ffffff`}
                  alt="Session QR Code"
                  className="w-48 h-48 md:w-64 md:h-64 object-contain"
                />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-xl text-primary">{sessionName}</h3>
                <p className="text-sm text-muted-foreground">
                  Bu kodu üyelere okutunuz.
                </p>
              </div>

              {/* Realtime Stats */}
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

              <Button
                variant="destructive"
                size="default"
                onClick={handleManualFinish}
                className="mt-4 w-full"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Yoklamayı Bitir
              </Button>
            </div>
          ) : (
            /* Empty State */
            <div className="text-center text-muted-foreground">
              <QrCode className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>QR kod burada görüntülenecektir.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}