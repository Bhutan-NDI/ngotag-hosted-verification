import { json } from "@/lib/server/http";
import { store } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe for load balancers and orchestrators. */
export async function GET() {
  const storeOk = await store().ping();
  return json({ ok: storeOk, store: storeOk ? "up" : "down" }, storeOk ? 200 : 503);
}
