import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { HostedFlow } from "@/components/hosted/HostedFlow";
import { isHostedId } from "@/lib/platform";
import { config } from "@/lib/server/config";
import type { DeviceMode } from "@/lib/types";

export const dynamic = "force-dynamic";

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i;

/**
 * The hosted page. Only the opaque hostedId comes from the URL (DL-003, HVP-SD §7 AC 4):
 * the request itself is loaded from the platform; `?mode` only switches the layout.
 */
export default async function HostedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ id }, { mode: modeParam }, h] = await Promise.all([params, searchParams, headers()]);
  if (!isHostedId(id)) notFound();

  // The page always offers both paths, so a wrong guess is never a dead end (HVP-SD §5.6).
  const mode: DeviceMode =
    modeParam === "web" || modeParam === "mobile"
      ? modeParam
      : MOBILE_UA.test(h.get("user-agent") ?? "")
        ? "mobile"
        : "web";

  return <HostedFlow key={`${id}-${mode}`} hostedId={id} apiBaseUrl={config.platformApiUrl} mode={mode} />;
}
