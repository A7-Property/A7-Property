"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#FAF8F5", color: "#0F1B2D", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <section style={{ maxWidth: 520 }}>
            <div style={{ width: 56, height: 56, display: "grid", placeItems: "center", margin: "0 auto", borderRadius: 999, background: "#EEF5FC", color: "#0057D9", fontSize: 24, fontWeight: 700 }}>A7</div>
            <h1 style={{ margin: "24px 0 0", fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.04em" }}>Something went wrong</h1>
            <p style={{ margin: "12px auto 0", maxWidth: 420, color: "#5A6577", fontSize: 14, lineHeight: 1.6 }}>Your journey is still here. Please try loading A7 Property again.</p>
            <button type="button" onClick={reset} style={{ minHeight: 48, marginTop: 24, padding: "0 22px", border: 0, borderRadius: 14, background: "#0057D9", color: "white", fontWeight: 700, cursor: "pointer" }}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
