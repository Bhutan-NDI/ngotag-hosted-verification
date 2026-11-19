import { headers } from "next/headers";
import { HostedFlow } from "@/components/hosted/HostedFlow";
import { config } from "@/lib/server/config";
import { log } from "@/lib/server/log";
import { getSession, toPublic } from "@/lib/server/sessions";
import type { DeviceMode, PublicSession } from "@/lib/types";

export const dynamic = "force-dynamic";

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i;

export default async function HostedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ id }, { mode: modeParam }, h] = await Promise.all([params, searchParams, headers()]);

  const mode: DeviceMode =
    modeParam === "web" || modeParam === "mobile"
      ? modeParam
      : MOBILE_UA.test(h.get("user-agent") ?? "")
        ? "mobile"
        : "web";

  let initial: PublicSession | null = null;
  try {
    const s = await getSession(id);
    initial = s ? toPublic(s) : null;
  } catch (err) {
    log.error("hosted page: session lookup failed", { sessionId: id, err });
    throw err; // rendered by app/error.tsx
  }

  return (
    <HostedFlow
      key={`${id}-${mode}`}
      sessionId={id}
      initialSession={initial}
      mode={mode}
      devTools={config.mock}
    />
  );
}
