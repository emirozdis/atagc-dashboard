"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Users, StopCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

interface DynamicRollCallQRProps {
  rollCallId: string;
  sessionName: string;
  onManualFinish: () => void;
  onComplete: () => void;
}

export function DynamicRollCallQR({
  rollCallId,
  sessionName,
  onManualFinish,
  onComplete
}: DynamicRollCallQRProps) {
  const supabase = useSupabaseRealtime();
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const isCompletedRef = useRef(false);

  // Keep this callback above every effect that consumes it so realtime and
  // polling updates always use the current completion handler.
  const checkCompletion = (scanned: number, total: number) => {
    if (total > 0 && scanned >= total && !isCompletedRef.current) {
      isCompletedRef.current = true;
      setTimeout(() => {
        onComplete();
        toast.success("All members are present; attendance is complete.");
      }, 500);
    }
  };

  // 1. Data Fetching with Polling (Reliable Sync)
  const { data: latestStats } = useQuery({
    queryKey: ['roll-call-stats-base', rollCallId],
    queryFn: async () => {
      const res = await fetch(`/api/roll-call/${rollCallId}/stats`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!rollCallId,
    refetchInterval: 3000, // Poll every 3 seconds to ensure updates even if realtime fails
    refetchOnWindowFocus: true
  });

  const [stats, setStats] = useState({ scanned: 0, total: 0 });

  // Sync state with Polling Data
  useEffect(() => {
    if (!latestStats) return;
    const frame = window.requestAnimationFrame(() => {
      setStats(latestStats);
      checkCompletion(latestStats.scanned, latestStats.total);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [latestStats]);

  // 2. Client-Side Realtime Subscription (Instant Feedback)
  useEffect(() => {
    if (!supabase || !rollCallId) return;

    const channel = supabase
      .channel(`live-attendance-${rollCallId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'roll_call_logs',
          filter: `roll_call_id=eq.${rollCallId}`
        },
        (payload) => {
          // Optimistic update for instant feedback
          setStats((prev) => {
            const newScanned = prev.scanned + 1;
            checkCompletion(newScanned, prev.total);
            return { ...prev, scanned: newScanned };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, rollCallId]);

  // 3. SSE for Secure Tokens (Server Push)
  useEffect(() => {
    if (!rollCallId) return;

    const eventSource = new EventSource(`/api/roll-call/${rollCallId}/stream`);

    eventSource.onopen = () => {
      setIsLive(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.otp) {
            setQrPayload(JSON.stringify(data));
        }
      } catch (e) {
        // Ignore parse errors from keep-alive
      }
    };

    eventSource.onerror = (err) => {
      if (eventSource.readyState === EventSource.CLOSED) {
          setIsLive(false);
      }
    };

    return () => {
      eventSource.close();
      setIsLive(false);
    };
  }, [rollCallId]);

  if (!qrPayload) return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="w-48 h-48 bg-muted/20 animate-pulse rounded-xl flex items-center justify-center">
             <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Establishing a secure connection...</p>
      </div>
  );

  return (
    <div className="text-center space-y-6 animate-in zoom-in fade-in w-full">
      <div className="relative inline-block">
        <div className="bg-white p-4 rounded-xl shadow-lg relative z-10">
            <QRCodeSVG
            value={qrPayload}
            size={256}
            level="M"
            className="w-48 h-48 md:w-64 md:h-64 object-contain"
            />
        </div>
        {isLive && (
            <div className="absolute -inset-1 bg-green-500/20 rounded-2xl z-0 animate-pulse" />
        )}
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-xl text-primary">{sessionName}</h3>
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          {isLive ? (
              <span className="flex items-center gap-1.5 text-green-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Live (5 sec)
              </span>
          ) : (
              <span className="text-amber-500 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Connecting...
              </span>
          )}
        </p>
      </div>

      {/* Realtime Stats */}
      <div className="bg-secondary/20 border border-border/50 rounded-lg p-4 flex items-center justify-between gap-4 max-w-xs mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 text-primary rounded-full">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-xs text-muted-foreground">Live attendance</div>
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
                strokeDasharray={`${Math.min(100, (stats.scanned / stats.total) * 100)}, 100`}
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
        End attendance
      </Button>
    </div>
  );
}

// Change Log:
// - Added `refetchInterval: 3000` to `useQuery` for reliable stat updates every 3 seconds.
// - Abstracted completion logic into `checkCompletion` to call it from both polling and realtime events.
// - Ensured state synchronization between polling data and local state.
