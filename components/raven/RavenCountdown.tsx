"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const EMPTY_TIME: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function calculateTimeLeft(targetDate: number | null): TimeLeft {
  if (!targetDate) return EMPTY_TIME;
  const difference = targetDate - Date.now();
  if (difference <= 0) return EMPTY_TIME;

  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference % 86_400_000) / 3_600_000),
    minutes: Math.floor((difference % 3_600_000) / 60_000),
    seconds: Math.floor((difference % 60_000) / 1_000),
  };
}

function TimeUnit({ value, label, mounted }: { value: number; label: string; mounted: boolean }) {
  return (
    <div className="raven-countdown-unit flex min-w-0 flex-col items-center">
      <div className="raven-countdown-box flex w-full min-w-0 items-center justify-center rounded-xl px-1 py-2.5">
        <span className="raven-countdown-value text-center text-[1.65rem] font-bold tabular-nums">
          {mounted ? value.toString().padStart(2, "0") : "00"}
        </span>
      </div>
      <span className="raven-countdown-label mt-2 text-[10px] uppercase tracking-[0.12em] text-white">{label}</span>
    </div>
  );
}

export default function RavenCountdown({ startDateIso }: { startDateIso: string | null }) {
  const targetDate = useMemo(() => {
    if (!startDateIso) return null;
    const parsed = new Date(startDateIso).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }, [startDateIso]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(EMPTY_TIME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeLeft(calculateTimeLeft(targetDate));
    if (!targetDate) return;

    const timer = window.setInterval(() => setTimeLeft(calculateTimeLeft(targetDate)), 1_000);
    return () => window.clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="raven-countdown mx-auto grid w-full max-w-lg grid-cols-4 gap-2 px-1 md:flex md:max-w-none md:justify-center" aria-label={targetDate ? "Time until RavenMUN" : "Conference date to be announced"}>
      <TimeUnit value={timeLeft.days} label="Days" mounted={mounted} />
      <TimeUnit value={timeLeft.hours} label="Hours" mounted={mounted} />
      <TimeUnit value={timeLeft.minutes} label="Minutes" mounted={mounted} />
      <TimeUnit value={timeLeft.seconds} label="Seconds" mounted={mounted} />
    </div>
  );
}
