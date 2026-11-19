import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness probe for load balancers and orchestrators. The page keeps no state of its own. */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
