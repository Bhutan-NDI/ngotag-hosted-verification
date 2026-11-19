"use client";

import { useState } from "react";
import type { View } from "@/lib/flow";
import type { DeviceMode } from "@/lib/types";

const ACTIONS = [
  ["scan", "Scan"],
  ["approve", "Approve"],
  ["decline", "Decline"],
  ["fail", "Fail"],
  ["expire", "Expire"],
  ["timeout", "Approval timeout"],
  ["cancel", "Cancel"],
] as const;

/** Mock-mode only: simulate wallet events for the current session. */
export function DevPanel({ sessionId, view, mode }: { sessionId: string; view: View; mode: DeviceMode }) {
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fire = async (action: string) => {
    setError(null);
    const res = await fetch(`/api/dev/sessions/${encodeURIComponent(sessionId)}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
  };

  const otherMode = mode === "web" ? "mobile" : "web";

  return (
    <aside className="fixed bottom-3 right-3 z-50 w-60 rounded-xl border border-line bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between font-semibold text-ink"
      >
        <span>Dev · mock NDI</span>
        <span className="text-subtle">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-subtle">
            view: <span className="font-mono text-ink">{view}</span> · mode:{" "}
            <span className="font-mono text-ink">{mode}</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ACTIONS.map(([action, label]) => (
              <button
                key={action}
                type="button"
                onClick={() => fire(action)}
                className="rounded-md border border-line px-2 py-1.5 text-left text-ink hover:bg-neutral-soft"
              >
                {label}
              </button>
            ))}
          </div>
          <a className="block text-brand underline underline-offset-2" href={`?mode=${otherMode}`}>
            Switch to {otherMode} layout
          </a>
          {error && <p className="text-danger">{error}</p>}
        </div>
      )}
    </aside>
  );
}
