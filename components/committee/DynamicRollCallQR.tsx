"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Users, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTOTP } from "@/lib/otp";
import { toast } from "sonner";

interface DynamicRollCallQRProps {
  rollCallId: string;
  secretKey: string;
  sessionName: string;
  onManualFinish: () => void;
  onComplete: () => void;
}

export function DynamicRollCallQR({
  rollCallId,
  secretKey,
  sessionName,
  onManualFinish,
  onComplete
}: DynamicRollCallQRProps) {
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const isCompletedRef = useRef(false);

  // 1. Dynamic QR Generation (Every 2 seconds)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateQR = async () => {
      if (!secretKey || !rollCallId) return;
      
      const token = await generateTOTP(secretKey);
      const payload = JSON.stringify({
        t: 'r',
        id: rollCallId,
        otp: token
      });
      setQrPayload(payload);
    };

    updateQR();
    interval = setInterval(updateQR, 2000);

    return () => clearInterval(interval);
  }, [rollCallId, secretKey]);

  // 2. Stats Polling (Every 3 seconds)
  const { data: stats = { scanned: 0, total: 0 } } = useQuery({
    queryKey: ['roll-call-stats', rollCallId],
    queryFn: async () => {
      const res = await fetch(`/api/roll-call/${rollCallId}/stats`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      if (data.total > 0 && data.scanned >= data.total && !isCompletedRef.current) {
        isCompletedRef.current = true;
        onComplete();
        toast.success("Tüm üyeler katıldı, yoklama tamamlandı.");
      }
      return data;
    },
    enabled: !!rollCallId,
    refetchInterval: 3000
  });

  if (!qrPayload) return null;

  return (
    <div className="text-center space-y-6 animate-in zoom-in fade-in w-full">
      <div className="bg-white p-4 rounded-xl shadow-lg inline-block relative">
        <QRCodeSVG
          value={qrPayload}
          size={256}
          level="M"
          className="w-48 h-48 md:w-64 md:h-64 object-contain"
        />
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-xl text-primary">{sessionName}</h3>
        <p className="text-sm text-muted-foreground">
          Kod her 5 saniyede bir yenilenir.
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
        onClick={onManualFinish}
        className="mt-4 w-full"
      >
        <StopCircle className="w-4 h-4 mr-2" />
        Yoklamayı Bitir
      </Button>
    </div>
  );
}

// Change Log:
// - New reusable component for displaying dynamic TOTP QR code and live stats.
// - Handles internal polling and QR regeneration to ensure consistency across views.