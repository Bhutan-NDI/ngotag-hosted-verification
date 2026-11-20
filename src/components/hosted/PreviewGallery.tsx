"use client";

import { useState } from "react";
import type { View } from "@/lib/flow";
import type { DeviceMode, PublicSession } from "@/lib/types";
import { cx } from "./ui";
import { StateView } from "./views";

/** Figma numbering, so each tile can be checked against its frame. */
const SCREENS: { view: View; label: string; web: boolean }[] = [
  { view: "loading", label: "2 · Loading", web: true },
  { view: "ready", label: "3 · Ready", web: true },
  { view: "opening", label: "4 · Opening wallet", web: false },
  { view: "still-opening", label: "5 · Still opening (after ~4 s)", web: false },
  { view: "waiting", label: "6 · Waiting after tap", web: false },
  { view: "returned", label: "7 · Done — original tab", web: false },
  { view: "qr", label: "8 · QR shown", web: false },
  { view: "scanned", label: "9 · Scanned", web: true },
  { view: "returning", label: "10 · Returning", web: true },
  { view: "declined", label: "11 · Declined by user", web: true },
  { view: "failed", label: "12 · Verification failed", web: true },
  { view: "expired", label: "13 · Expired", web: true },
  { view: "timed-out", label: "14 · Not approved in time", web: true },
  { view: "not-found", label: "15 · Not found", web: true },
  { view: "reconnecting", label: "16 · Connection trouble", web: true },
  { view: "gone", label: "17 · No longer available, mid-request", web: true },
];

function demoSession(view: View): PublicSession | undefined {
  if (view === "not-found") return undefined; // the page never learned the host
  return {
    hostedId: "preview",
    status: "pending",
    returnHost: "service.gov.bt",
    redirectUri: "https://service.gov.bt/callback",
    proofRequestURL: "https://bhutanndi.example/oob?preview=1",
    deepLinkURL: "https://bhutanndi.app.link/?preview=1",
    expiresAt: 0, // not rendered
    validForSeconds: 600,
    returnUrl: ["returned", "returning", "declined", "failed"].includes(view)
      ? "https://service.gov.bt/callback?response_code=preview"
      : undefined,
  };
}

export function PreviewGallery() {
  const [mode, setMode] = useState<DeviceMode>("mobile");
  const screens = SCREENS.filter((s) => mode === "mobile" || s.web);

  return (
    <main className="min-h-dvh px-4 py-8 sm:px-8">
      <header className="mx-auto mb-8 flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Hosted page — all screens</h1>
          <p className="text-sm text-muted">Design QA (ENABLE_PREVIEW). Demo data; links are live, nothing redirects on its own.</p>
        </div>
        <div className="flex rounded-full border border-line bg-surface p-1">
          {(["mobile", "web"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                "rounded-full px-4 py-1.5 text-sm font-semibold",
                mode === m ? "bg-primary text-white" : "text-label hover:bg-canvas",
              )}
            >
              {m === "mobile" ? "Phone (390)" : "Web"}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-wrap justify-center gap-8">
        {screens.map(({ view, label }) => (
          <figure key={`${mode}-${view}`} className="flex flex-col gap-3">
            <figcaption className="text-base font-semibold text-primary">{label}</figcaption>
            <div
              className={cx(
                "flex justify-center rounded-[28px] border border-line px-4 py-8",
                mode === "mobile" ? "w-[390px] max-w-full" : "w-[706px] max-w-full",
              )}
            >
              <StateView view={view} mode={mode} session={demoSession(view)} preview onShowQr={() => {}} onHideQr={() => {}} />
            </div>
          </figure>
        ))}
      </div>
    </main>
  );
}
