"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface TurnstileRenderOptions {
    sitekey: string;
    callback: (token: string) => void;
    "error-callback": () => void;
    "expired-callback": () => void;
    theme: "light" | "dark";
  }

  interface TurnstileApi {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
    remove: (widgetId: string) => void;
  }

  interface Window {
    turnstile?: TurnstileApi;
  }
}

// The site key is always supplied by the configured Turnstile widget. This
// keeps local development and deployed environments on the same real key.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function Turnstile({ siteKey, onVerify, onError, onExpire, theme = "auto" }: TurnstileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  const { theme: systemTheme } = useTheme();

  // Keep the widget mounted when a parent stores the token in state. Parent
  // callbacks are commonly inline functions, so depending on them here would
  // tear down and recreate the Cloudflare widget on every token update.
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  }, [onError, onExpire, onVerify]);

  const renderWidget = useCallback(() => {
    if (!ref.current || !window.turnstile || widgetIdRef.current) return;

    ref.current.innerHTML = "";

    try {
      const id = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerifyRef.current(token),
        "error-callback": () => onErrorRef.current?.(),
        "expired-callback": () => onExpireRef.current?.(),
        theme: theme === "auto" ? (systemTheme === "dark" ? "dark" : "light") : theme,
      });
      widgetIdRef.current = id;
    } catch (error) {
      console.warn("Turnstile render error", error);
    }
  }, [siteKey, systemTheme, theme]);

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
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (error) {
          // Ignore removal errors if widget already gone
        }
      }
    };
  }, [renderWidget]);

  return <div ref={ref} className="min-h-[65px] flex justify-center" />;
}

// Change Log:
// - Added check for existing script tag to prevent "Turnstile already has been loaded" warning.
// - Added cleanup logic for event listeners.
// - Improved widget ID tracking to prevent double rendering.
