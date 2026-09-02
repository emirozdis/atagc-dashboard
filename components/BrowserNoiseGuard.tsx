"use client";

import { useEffect } from "react";

function isIgnorableReason(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason || "");
  return message.includes("message channel closed") || message.includes("A listener indicated an asynchronous response");
}

function isIgnorableError(event: ErrorEvent) {
  const message = event.message || "";
  const source = event.filename || "";
  if (message.includes("startTime") && (!source || source === "undefined" || source.includes("anonymous") || source.startsWith("debugger://") || source.includes("VM"))) {
    return true;
  }
  if (message.includes("OTS parsing error")) return true;
  return false;
}

export default function BrowserNoiseGuard() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isIgnorableReason(event.reason)) event.preventDefault();
    };
    const onError = (event: ErrorEvent) => {
      if (isIgnorableError(event)) event.preventDefault();
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError, true);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError, true);
    };
  }, []);

  return null;
}
