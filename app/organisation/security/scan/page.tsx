"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ScanLine, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { ScannerOverlay } from "@/components/dashboard/ScannerOverlay";
import { toast } from "sonner";

export default function SecurityScanPage() {
  const [active, setActive] = useState(true);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const handleScan = (detected: IDetectedBarcode[]) => {
    if (detected.length > 0 && active) {
        const raw = detected[0].rawValue;
        if (raw === lastScan) return; // Prevent double scan
        setLastScan(raw);
        setActive(false);
        
        // Mock processing
        toast.info("Kod okundu: " + raw);
        setTimeout(() => setActive(true), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl mx-auto pb-12">
      <Breadcrumbs items={[{ label: "Organizasyon", href: "/organisation" }, { label: "Güvenlik Tarama" }]} />
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Güvenlik Kontrolü</h2>
        <p className="text-muted-foreground">Katılımcı giriş kartlarını tarayın.</p>
      </div>

      <div className="relative aspect-square rounded-3xl overflow-hidden bg-black shadow-2xl border border-border/50">
        {active ? (
            <>
                <Scanner onScan={handleScan} />
                <ScannerOverlay />
            </>
        ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-20">
                <div className="flex flex-col items-center gap-4 animate-in zoom-in">
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                    <span className="text-lg font-medium">İşleniyor...</span>
                </div>
            </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <Button onClick={() => { setActive(true); setLastScan(null); }} variant="outline">
            Taramayı Sıfırla
        </Button>
      </div>
    </div>
  );
}