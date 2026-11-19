import { NextResponse } from "next/server";
import { config } from "@/lib/server/config";
import { simulateMock, type MockAction } from "@/lib/server/mockPlatform";

export const dynamic = "force-dynamic";

const ACTIONS: MockAction[] = ["scan", "complete", "decline", "fail", "expire"];

/**
 * Dev only: move a mock session on, as the wallet and platform would.
 *   curl -X POST localhost:3000/mock-platform/verification/hosted/<id>/simulate -d '{"action":"scan"}'
 */
export async function POST(req: Request, ctx: { params: Promise<{ hostedId: string }> }) {
  if (!config.mockPlatform) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { hostedId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: MockAction };
  if (!body.action || !ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: `action must be one of ${ACTIONS.join(", ")}` }, { status: 400 });
  }
  const result = simulateMock(hostedId, body.action);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(result);
}
