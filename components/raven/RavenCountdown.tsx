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
    <div className="flex flex-col items-center">
      <div className="raven-countdown-box flex min-w-[100px] items-center justify-center rounded-lg px-6 py-4 max-sm:w-[66px] max-sm:min-w-0 max-sm:px-0 max-sm:py-3">
        <span className="text-center text-5xl font-bold tabular-nums max-sm:text-3xl">
          {mounted ? value.toString().padStart(2, "0") : "00"}
        </span>
      </div>
      <span className="mt-2 text-base uppercase tracking-wider text-white max-sm:text-[11px] max-sm:tracking-[0.08em] sm:text-lg">{label}</span>
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
    <div className="mx-auto flex w-full justify-center gap-4 max-sm:max-w-[320px] max-sm:gap-2" aria-label={targetDate ? "Time until RavenMUN" : "Conference date to be announced"}>
      <TimeUnit value={timeLeft.days} label="Days" mounted={mounted} />
      <TimeUnit value={timeLeft.hours} label="Hours" mounted={mounted} />
      <TimeUnit value={timeLeft.minutes} label="Minutes" mounted={mounted} />
      <TimeUnit value={timeLeft.seconds} label="Seconds" mounted={mounted} />
    </div>
  );
}
