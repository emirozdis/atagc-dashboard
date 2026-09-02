"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#07050c", color: "#f5f3ff", fontFamily: "Georgia, serif" }}>
        <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: "2rem", textAlign: "center" }}>
          <div>
            <p style={{ letterSpacing: "0.28em", textTransform: "uppercase", color: "#c4b5fd", fontSize: 12 }}>RavenMUN</p>
            <h1 style={{ fontSize: "2rem", margin: "1rem 0" }}>Something went wrong</h1>
            <p style={{ color: "rgba(255,255,255,0.75)", maxWidth: 420, margin: "0 auto 1.5rem" }}>Please reload the page. If the problem continues, try again later.</p>
            <button
              type="button"
              onClick={reset}
              style={{ background: "#7C3AED", color: "white", border: 0, borderRadius: 12, padding: "0.8rem 1.4rem", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
