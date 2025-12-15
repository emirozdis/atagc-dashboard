"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ScanLine,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  CameraOff,
  XCircle,
  RotateCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'duplicate' | 'error';

export default function ScanPage() {
  const [token, setToken] = useState("");
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [sessionName, setSessionName] = useState<string>("");

  // Handle successful scan from the camera
  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const scannedValue = detectedCodes[0].rawValue;

      if (scannedValue && scanState !== 'processing' && scanState !== 'success' && scanState !== 'duplicate') {
        setIsCameraActive(false); // Turn off camera
        setToken(scannedValue);   // Set the value in input
        await processScan(scannedValue); // Trigger API
      }
    }
  };

  // Process the scan (API Call)
  const processScan = async (code: string) => {
    setScanState('processing');
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
      toast.error("Hata", { description: err.message });
    }
  };

  // Handle manual form submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      await processScan(token);
    }
  };

  const resetScan = () => {
    setToken("");
    setScanState('idle');
    setResultMessage("");
    setSessionName("");
    setIsCameraActive(false);
  };

  // Render different states
  if (scanState === 'success') {
    return (
      <div className="max-w-md mx-auto py-12 animate-in zoom-in-95 duration-300">
        <Card className="bg-green-500/10 border-green-500/20 text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-green-500/20 rounded-full">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-500 mb-2">Yoklama Alındı!</h2>
          <p className="text-lg font-medium text-foreground mb-4">{sessionName}</p>
          <p className="text-muted-foreground mb-8">Katılımınız başarıyla kaydedilmiştir.</p>
          <Button onClick={resetScan} variant="outline" className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" /> Yeni İşlem
          </Button>
        </Card>
      </div>
    );
  }

  if (scanState === 'duplicate') {
    return (
      <div className="max-w-md mx-auto py-12 animate-in zoom-in-95 duration-300">
        <Card className="bg-yellow-500/10 border-yellow-500/20 text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-yellow-500/20 rounded-full">
              <AlertTriangle className="w-16 h-16 text-yellow-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-yellow-500 mb-2">Zaten Kayıtlı</h2>
          <p className="text-muted-foreground mb-8">{resultMessage}</p>
          <Button onClick={resetScan} variant="outline" className="w-full border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-500">
            <RotateCcw className="w-4 h-4 mr-2" /> Geri Dön
          </Button>
        </Card>
      </div>
    );
  }

  if (scanState === 'error') {
    return (
      <div className="max-w-md mx-auto py-12 animate-in zoom-in-95 duration-300">
        <Card className="bg-red-500/10 border-red-500/20 text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500/20 rounded-full">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-red-500 mb-2">İşlem Başarısız</h2>
          <p className="text-muted-foreground mb-8">{resultMessage}</p>
          <Button onClick={resetScan} variant="outline" className="w-full border-red-500/30 hover:bg-red-500/10 text-red-500">
            <RotateCcw className="w-4 h-4 mr-2" /> Tekrar Dene
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in py-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-display font-bold text-foreground">Yoklama Ver</h2>
        <p className="text-muted-foreground">
          Komite başkanınızın gösterdiği QR kodu okutun veya kodu girin.
        </p>
      </div>

      <Card className="bg-card border-border/50 overflow-hidden">
        {/* Camera Section */}
        <div className="aspect-square relative bg-black flex flex-col items-center justify-center border-b border-border/50 overflow-hidden">
          {isCameraActive ? (
            <div className="w-full h-full relative">
              <Scanner
                onScan={handleScan}
                onError={(error) => console.error(error)}
                components={{
                  finder: true,
                  torch: false
                }}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%", objectFit: "cover" }
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center text-muted-foreground/50">
              <ScanLine className="w-24 h-24 mb-4" />
              <p className="text-sm">Kamera kapalı</p>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 gap-2 shadow-lg"
            onClick={() => setIsCameraActive(!isCameraActive)}
            type="button"
            disabled={scanState === 'processing'}
          >
            {isCameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            {isCameraActive ? "Kamerayı Kapat" : "Kamerayı Aç"}
          </Button>
        </div>

        {/* Manual Input Section */}
        <CardHeader>
          <CardTitle className="text-lg">Manuel Kod Girişi</CardTitle>
          <CardDescription>
            Kamera çalışmıyorsa kodu buraya yazın.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="QR Kod Değeri"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-center tracking-wider"
                autoComplete="off"
                disabled={scanState === 'processing'}
              />
            </div>

            <Button type="submit" className="w-full" disabled={scanState === 'processing' || !token}>
              {scanState === 'processing' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Yoklamayı Onayla
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
// Change Log:
// - Implemented full state handling: `success`, `duplicate`, and `error` states are now distinctive full-card views.
// - Replaced the simple toast-based feedback with proper UI feedback screens as requested.
// - Added logic to capture `sessionName` from the API response for the success screen.