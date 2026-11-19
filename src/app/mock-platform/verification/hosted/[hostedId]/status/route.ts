import { NextResponse } from "next/server";
import { config } from "@/lib/server/config";
import { getMockStatus } from "@/lib/server/mockPlatform";

export const dynamic = "force-dynamic";

/** Mock of platform `GET /verification/hosted/:hostedId/status` (MOCK_PLATFORM only). */
export async function GET(_req: Request, ctx: { params: Promise<{ hostedId: string }> }) {
  if (!config.mockPlatform) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { hostedId } = await ctx.params;
  const status = getMockStatus(hostedId);
  if (!status) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
