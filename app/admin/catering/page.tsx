"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { ScannerOverlay } from "@/components/dashboard/ScannerOverlay";
import {
  UtensilsCrossed,
  Loader2,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ScanState = "idle" | "processing" | "success" | "duplicate" | "error";

export default function CateringPage() {
  const [shortId, setShortId] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultName, setResultName] = useState("");

  const logMutation = useMutation({
    mutationFn: async (payload: { short_id?: string; user_id?: string }) => {
      const res = await fetch("/api/catering/update_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "İşlem başarısız oldu.");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.user_name
          ? `${data.user_name} için yemek kaydı oluşturuldu.`
          : "Yemek kaydı oluşturuldu."
      );
      setShortId("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = shortId.trim();
    if (!trimmed) return;
    logMutation.mutate({ short_id: trimmed });
  };

  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (
      detectedCodes.length > 0 &&
      scanState !== "processing" &&
      scanState !== "success" &&
      scanState !== "duplicate"
    ) {
      const raw = detectedCodes[0].rawValue;
      if (!raw) return;

      setIsCameraActive(false);
      setScanState("processing");

      try {
        const parsed = JSON.parse(raw);
        if (parsed.t !== "u" || !parsed.id) {
          throw new Error("Geçersiz QR kodu. Kullanıcı kimlik kartı QR'ı tarayın.");
        }

        const res = await fetch("/api/catering/update_status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: parsed.id }),
        });

        const data = await res.json();

        if (res.ok) {
          setResultName(data.user_name || "");
          setResultMessage(
            data.user_name
              ? `${data.user_name} için yemek kaydı oluşturuldu.`
              : "Yemek kaydı oluşturuldu."
          );
          setScanState("success");
        } else if (res.status === 409) {
          setResultName(data.user_name || "");
          setResultMessage(data.message || "Bu kullanıcı bugün zaten kaydedilmiş.");
          setScanState("duplicate");
        } else {
          throw new Error(data.message || data.error || "İşlem başarısız oldu.");
        }
      } catch (err: any) {
        setResultMessage(err.message || "Bilinmeyen bir hata oluştu.");
        setScanState("error");
      }
    }
  };

  const resetScan = () => {
    setScanState("idle");
    setResultMessage("");
    setResultName("");
    setIsCameraActive(true);
  };

  const breadcrumbItems = [{ label: "Yemek Yönetimi" }];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            Yemek Yönetimi
          </h2>
          <p className="text-muted-foreground mt-1">
            QR kod tarayarak veya kimlik numarası girerek yemek kaydı oluşturun.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Scanner */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">QR Kod Tara</h3>
          <AnimatePresence mode="wait">
            {scanState === "processing" ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-16 space-y-4"
              >
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">İşleniyor...</p>
              </motion.div>
            ) : scanState === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="bg-green-500/5 border-green-500/20 text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-green-500/20 rounded-full">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-green-500 mb-1">Kaydedildi</h3>
                  {resultName && (
                    <p className="text-foreground font-medium mb-2">{resultName}</p>
                  )}
                  <p className="text-muted-foreground text-sm mb-4">{resultMessage}</p>
                  <Button onClick={resetScan} variant="outline" className="w-full">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Tekrar Tara
                  </Button>
                </Card>
              </motion.div>
            ) : scanState === "duplicate" ? (
              <motion.div
                key="duplicate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="bg-yellow-500/5 border-yellow-500/20 text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-yellow-500/20 rounded-full">
                      <XCircle className="w-10 h-10 text-yellow-500" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-yellow-500 mb-1">Zaten Kaydedilmiş</h3>
                  <p className="text-muted-foreground text-sm mb-4">{resultMessage}</p>
                  <Button onClick={resetScan} variant="outline" className="w-full">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Tekrar Tara
                  </Button>
                </Card>
              </motion.div>
            ) : scanState === "error" ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="bg-red-500/5 border-red-500/20 text-center p-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-red-500/20 rounded-full">
                      <XCircle className="w-10 h-10 text-red-500" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-red-500 mb-1">Hata</h3>
                  <p className="text-muted-foreground text-sm mb-4">{resultMessage}</p>
                  <Button onClick={resetScan} variant="outline" className="w-full">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Tekrar Dene
                  </Button>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <div className="aspect-square relative rounded-2xl overflow-hidden bg-zinc-950 border border-border/50">
                  {isCameraActive ? (
                    <div className="w-full h-full relative">
                      <Scanner
                        onScan={handleScan}
                        onError={(error) => console.error(error)}
                        components={{ finder: false, torch: false }}
                        styles={{
                          container: { width: "100%", height: "100%" },
                          video: { width: "100%", height: "100%", objectFit: "cover" },
                        }}
                      />
                      <ScannerOverlay />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <div className="p-6 bg-secondary/50 rounded-full border border-white/5 mb-4">
                        <CameraOff className="w-12 h-12 opacity-40" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-1">Kamera Kapalı</h3>
                      <p className="text-muted-foreground text-xs max-w-[240px] text-center">
                        Kullanıcının kimlik kartı QR kodunu tarayın.
                      </p>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30 px-6">
                    <Button
                      variant={isCameraActive ? "secondary" : "default"}
                      size="lg"
                      className="w-full max-w-xs h-12 rounded-full gap-2 shadow-xl backdrop-blur-sm active:scale-95"
                      onClick={() => setIsCameraActive(!isCameraActive)}
                    >
                      {isCameraActive ? (
                        <CameraOff className="w-4 h-4" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      {isCameraActive ? "Kamerayı Durdur" : "Taramayı Başlat"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Manual Input */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Manuel Giriş</h3>
          <div className="rounded-lg border border-border bg-card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="shortId" className="text-sm font-medium text-foreground">
                  Kimlik Numarası
                </label>
                <Input
                  id="shortId"
                  placeholder="Örn: A1B2C3D4"
                  value={shortId}
                  onChange={(e) => setShortId(e.target.value.toUpperCase())}
                  disabled={logMutation.isPending}
                  className="font-mono tracking-wider uppercase"
                />
              </div>
              <Button
                type="submit"
                disabled={logMutation.isPending || !shortId.trim()}
                className="w-full"
              >
                {logMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                )}
                Kaydet
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}