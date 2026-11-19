import { NextResponse } from "next/server";
import { config } from "@/lib/server/config";
import { log } from "@/lib/server/log";
import { completeSession, isSessionId } from "@/lib/server/sessions";

/**
 * The user is leaving the hosted page. Finalise the session and send them
 * back to the partner with ?session_id=&status=&state=.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const back = new URL(`/v/${encodeURIComponent(id)}`, config.appBaseUrl);
  if (!isSessionId(id)) return NextResponse.redirect(back, 303);
  try {
    const target = await completeSession(id);
    return NextResponse.redirect(target ?? back, 303);
  } catch (err) {
    log.error("complete session failed", { sessionId: id, err });
    return NextResponse.redirect(back, 303);
  }
}
