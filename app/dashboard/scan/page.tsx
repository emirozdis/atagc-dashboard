"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  CameraOff,
  XCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ScannerOverlay } from "@/components/dashboard/ScannerOverlay";
import { motion, AnimatePresence } from "framer-motion";

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'duplicate' | 'error';
type ScanType = 'roll-call' | 'connection';

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [sessionName, setSessionName] = useState<string>("");
  const [scanType, setScanType] = useState<ScanType>('roll-call');

  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const scannedValue = detectedCodes[0].rawValue;

      if (scannedValue && scanState !== 'processing' && scanState !== 'success' && scanState !== 'duplicate') {
        setIsCameraActive(false); 
        await processScan(scannedValue); 
      }
    }
  };

  const processScan = async (code: string) => {
    setScanState('processing');
    
    // Determine type (User Connection vs Roll Call)
    let isUserQr = false;
    let targetId = code;

    try {
      // Try parsing as JSON to see if it's a User QR
      const parsed = JSON.parse(code);
      if (parsed.t === 'u' && parsed.id) {
        isUserQr = true;
        targetId = parsed.id;
      }
    } catch (e) {
      // Not JSON, assume simple UUID string = Roll Call (or legacy format)
      isUserQr = false;
    }

    if (isUserQr) {
      setScanType('connection');
      await handleConnectionScan(targetId);
    } else {
      setScanType('roll-call');
      await handleRollCallScan(code);
    }
  };

  const handleConnectionScan = async (targetId: string) => {
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetId }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === 'already_connected') {
           setResultMessage(data.message || "Zaten bağlantınız var.");
           setScanState('duplicate');
        } else if (data.status === 'pending') {
           setResultMessage(data.message || "İstek zaten gönderildi.");
           setScanState('duplicate');
        } else {
           setSessionName("Bağlantı İsteği");
           setResultMessage(data.message || "İstek gönderildi.");
           setScanState('success');
           toast.success("İstek Gönderildi");
        }
      } else {
        throw new Error(data.error || "İşlem başarısız");
      }
    } catch (err: any) {
      setResultMessage(err.message || "Bilinmeyen bir hata oluştu.");
      setScanState('error');
    }
  };

  const handleRollCallScan = async (code: string) => {
    try {
      const res = await fetch("/api/roll-call/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setSessionName(data.session_name || "Oturum");
        setResultMessage(data.message || "Yoklama alındı.");
        setScanState('success');
        toast.success("İşlem Başarılı");
      } else if (res.status === 409) {
        setResultMessage(data.error || "Bu oturum için zaten yoklama verdiniz.");
        setScanState('duplicate');
      } else {
        throw new Error(data.error || "İşlem başarısız");
      }

    } catch (err: any) {
      setResultMessage(err.message || "Bilinmeyen bir hata oluştu.");
      setScanState('error');
    }
  };

  const resetScan = () => {
    setScanState('idle');
    setResultMessage("");
    setSessionName("");
    setIsCameraActive(true);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 md:space-y-8 animate-fade-in py-4 md:py-6 px-4 pb-20 overflow-hidden">
      <Breadcrumbs items={[{ label: "Tara" }]} />

      <div className="space-y-2 text-center">
        <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-foreground">QR Tara</h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-sm mx-auto">
          Yoklama QR kodunu veya başka bir delegenin kimlik kartını okutun.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {scanState === 'processing' ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-12 md:py-20 space-y-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-primary animate-spin relative z-10" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg md:text-xl font-semibold">Kod İşleniyor</h3>
              <p className="text-muted-foreground text-sm">Lütfen bekleyin...</p>
            </div>
          </motion.div>
        ) : scanState === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <Card className="bg-green-500/5 border-green-500/20 text-center p-6 md:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-green-500/40" />
              </div>
              <div className="flex justify-center mb-6 md:mb-8">
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 bg-green-500/30 blur-2xl rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="p-4 md:p-5 bg-green-500/20 rounded-full relative z-10">
                    {scanType === 'connection' ? <UserPlus className="w-12 h-12 text-green-500" /> : <CheckCircle2 className="w-12 h-12 text-green-500" />}
                  </div>
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-green-500 mb-2">Başarılı!</h2>
              <p className="text-base md:text-lg font-medium text-foreground mb-4">{sessionName}</p>
              <p className="text-sm md:text-muted-foreground mb-6 md:mb-8 text-balance">
                {resultMessage}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={resetScan} variant="outline">
                    Tekrar Tara
                </Button>
                <Button onClick={() => window.location.href = scanType === 'connection' ? '/dashboard/connections' : '/dashboard'} variant="default">
                    {scanType === 'connection' ? 'Bağlantılarım' : 'Panoya Dön'}
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : scanState === 'duplicate' ? (
          <motion.div
            key="duplicate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <Card className="bg-yellow-500/5 border-yellow-500/20 text-center p-6 md:p-10">
              <div className="flex justify-center mb-6 md:mb-8">
                <div className="p-4 md:p-5 bg-yellow-500/20 rounded-full">
                  <ShieldCheck className="w-12 h-12 md:w-16 md:h-16 text-yellow-500" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-yellow-500 mb-2">Bilgi</h2>
              <p className="text-muted-foreground mb-6 md:mb-8 text-base md:text-lg">{resultMessage}</p>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={resetScan} variant="outline" className="border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-500">
                    Tekrar Tara
                </Button>
                <Button onClick={() => window.location.href = '/dashboard'} variant="outline" className="border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-500">
                    Panoya Dön
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : scanState === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <Card className="bg-red-500/5 border-red-500/20 text-center p-6 md:p-10">
              <div className="flex justify-center mb-6 md:mb-8">
                <div className="p-4 md:p-5 bg-red-500/20 rounded-full">
                  <XCircle className="w-12 h-12 md:w-16 md:h-16 text-red-500" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-red-500 mb-2">Bir Hata Oluştu</h2>
              <p className="text-muted-foreground mb-6 md:mb-8 text-base md:text-lg">{resultMessage}</p>
              <Button onClick={resetScan} variant="outline" className="w-full h-11 md:h-12 text-base md:text-lg border-red-500/30 hover:bg-red-500/10 text-red-500">
                <RotateCcw className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" /> Tekrar Dene
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="scanner"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative group overflow-hidden rounded-3xl"
          >
            <div className="aspect-[3/4] md:aspect-square relative rounded-3xl overflow-hidden bg-zinc-950 border border-border/50 shadow-2xl">
              {isCameraActive ? (
                <div className="w-full h-full relative">
                  <Scanner
                    onScan={handleScan}
                    onError={(error) => console.error(error)}
                    components={{ finder: false, torch: false }}
                    styles={{
                      container: { width: "100%", height: "100%" },
                      video: { width: "100%", height: "100%", objectFit: "cover" }
                    }}
                  />
                  <ScannerOverlay />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-grid-white/[0.02]">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
                    <div className="p-6 bg-secondary/50 rounded-full relative border border-white/5">
                      <CameraOff className="w-12 h-12 md:w-16 md:h-16 opacity-40" />
                    </div>
                  </div>
                  <h3 className="text-lg md:text-xl font-medium text-white mb-2">Kamera Kapalı</h3>
                  <p className="text-muted-foreground text-xs md:text-sm max-w-[240px] text-center">
                    QR kodunu okutmak için kamerayı aktif etmelisiniz.
                  </p>
                </div>
              )}

              <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex justify-center z-30 px-6">
                <Button
                  variant={isCameraActive ? "secondary" : "default"}
                  size="lg"
                  className="w-full max-w-xs h-12 md:h-14 rounded-full gap-2 md:gap-3 shadow-xl backdrop-blur-sm transition-all active:scale-95 text-sm md:text-base"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                >
                  {isCameraActive ? <CameraOff className="w-4 h-4 md:w-5 md:h-5" /> : <Camera className="w-4 h-4 md:w-5 md:h-5" />}
                  {isCameraActive ? "Kamerayı Durdur" : "Taramayı Başlat"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
// Change Log:
// - Added logic to parse JSON QR codes.
// - Routes scan result to either `handleConnectionScan` or `handleRollCallScan`.
// - Updated result UI to handle connection outcomes.