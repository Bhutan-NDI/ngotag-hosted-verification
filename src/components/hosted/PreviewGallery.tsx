"use client";

import { LanguageToggle } from "@/components/hosted/ui";
import { StateView } from "@/components/hosted/views";
import type { View } from "@/lib/flow";
import type { DeviceMode, PublicSession } from "@/lib/types";

/** Design QA: every screen from the Figma file, mobile and web, side by side. */

const now = Date.now();
const session: PublicSession = {
  id: "preview",
  status: "pending",
  partnerName: "Demo Service Portal",
  partnerHost: "service.gov.bt",
  proofRequestURL: "https://example.bt/ndi/proof/preview-thread",
  deepLinkURL: "bhutanndi://proof?thread=preview",
  expiresAt: now + 4 * 60 * 1000 + 32 * 1000,
  approvalDeadline: now + 90 * 1000,
  canRestart: true,
};

const MOBILE: [View, string][] = [
  ["loading", "2 · Loading"],
  ["ready", "3 · Ready"],
  ["opening", "4 · Opening wallet"],
  ["still-opening", "5 · Still opening (after ~4s)"],
  ["waiting", "6 · Waiting after tap"],
  ["done-elsewhere", "7 · Done — original tab"],
  ["qr", "8 · QR shown"],
  ["scanned", "9 · Scanned"],
  ["returning", "10 · Returning"],
  ["declined", "11 · Declined by user"],
  ["failed", "12 · Verification failed"],
  ["expired", "13 · Expired"],
  ["timed-out", "14 · Not approved in time"],
  ["not-found", "15 · Not found"],
  ["reconnecting", "16 · Connection trouble"],
  ["unavailable", "17 · No longer available, mid-request"],
];

const WEB: [View, string][] = [
  ["loading", "2w · Loading"],
  ["ready", "3w · Ready"],
  ["scanned", "5w · Scanned"],
  ["returning", "10w · Returning"],
  ["declined", "11w · Declined by user"],
  ["failed", "12w · Verification failed"],
  ["expired", "13w · Expired"],
  ["timed-out", "14w · Not approved in time"],
  ["not-found", "15w · Not found"],
  ["reconnecting", "16w · Connection trouble"],
  ["unavailable", "17w · No longer available, mid-request"],
];

function Row({ title, mode, items, width }: { title: string; mode: DeviceMode; items: [View, string][]; width: number }) {
  return (
    <section className="mt-10">
      <h2 className="px-6 text-sm font-semibold text-muted">{title}</h2>
      <div className="mt-4 flex gap-6 overflow-x-auto px-6 pb-6">
        {items.map(([view, label]) => (
          <figure key={view} className="shrink-0" style={{ width }}>
            <figcaption className="mb-2 text-xs font-medium text-subtle">{label}</figcaption>
            <div className="rounded-2xl bg-canvas p-3 ring-1 ring-line">
              <StateView view={view} mode={mode} session={session} />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function PreviewGallery() {
  return (
    <div className="min-h-dvh bg-white py-8">
      <header className="flex flex-wrap items-start justify-between gap-4 px-6">
        <div>
          <h1 className="text-lg font-semibold">Bhutan NDI hosted page — all states</h1>
          <p className="text-sm text-muted">Static previews with sample data. Scroll each row sideways.</p>
        </div>
        <LanguageToggle />
      </header>
      <Row title="Mobile" mode="mobile" items={MOBILE} width={390} />
      <Row title="Web" mode="web" items={WEB} width={520} />
    </div>
  );
}
