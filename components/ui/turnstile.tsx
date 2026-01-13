"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface Window {
    turnstile: any;
  }
}

export function Turnstile({ siteKey, onVerify, onError, onExpire, theme = "auto" }: TurnstileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const { theme: systemTheme } = useTheme();

  useEffect(() => {
    // If turnstile is already loaded, render
    if (window.turnstile) {
      renderWidget();
    } else {
      // Load script
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => renderWidget();
      document.body.appendChild(script);
    }

    return () => {
      // Cleanup if needed (reset widget)
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderWidget = () => {
    if (!ref.current || !window.turnstile) return;

    // Avoid double rendering
    if (ref.current.innerHTML !== "") return;

    try {
      const id = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        "error-callback": () => onError?.(),
        "expired-callback": () => onExpire?.(),
        theme: theme === "auto" ? (systemTheme === "dark" ? "dark" : "light") : theme,
      });
      setWidgetId(id);
    } catch (e) {
      console.warn("Turnstile render error", e);
    }
  };

  return <div ref={ref} className="min-h-[65px] flex justify-center" />;
}

// Change Log:
// - Created a reusable React component for Cloudflare Turnstile.
// - Handles script loading and widget rendering dynamically.