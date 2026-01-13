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
    // Check if script is already present
    const scriptId = "cf-turnstile-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const initWidget = () => {
      if (window.turnstile) {
        renderWidget();
      } else {
        // If script exists but not loaded, wait for it
        script.addEventListener("load", renderWidget);
      }
    };

    initWidget();

    return () => {
      script.removeEventListener("load", renderWidget);
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch (e) {
          // Ignore removal errors if widget already gone
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderWidget = () => {
    if (!ref.current || !window.turnstile) return;

    // Avoid double rendering if widget ID already exists
    if (widgetId) return;

    // Clear content just in case
    ref.current.innerHTML = "";

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
// - Added check for existing script tag to prevent "Turnstile already has been loaded" warning.
// - Added cleanup logic for event listeners.
// - Improved widget ID tracking to prevent double rendering.