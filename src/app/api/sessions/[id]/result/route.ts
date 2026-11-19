import { handleError, json } from "@/lib/server/http";
import { getSession, isSessionId, partnerFromAuth } from "@/lib/server/sessions";

/**
 * Partner API — fetch the outcome after the user is redirected back.
 *
 *   GET /api/sessions/<id>/result
 *   Authorization: Bearer <partner apiKey>
 *
 * Never trust the `status` query param on the redirect alone — always confirm
 * here server-to-server. Partners can only read their own sessions.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const partner = partnerFromAuth(req.headers.get("authorization"));
  if (!partner) return json({ error: "unauthorized" }, 401);
  const { id } = await ctx.params;
  if (!isSessionId(id)) return json({ error: "not found" }, 404);

  try {
    const s = await getSession(id);
    if (!s || s.partnerId !== partner.id) return json({ error: "not found" }, 404);
    const status = s.status === "completed" ? s.outcome : s.status;
    return json({
      id: s.id,
      status,
      state: s.state,
      attributes: status === "verified" ? s.result : undefined,
    });
  } catch (e) {
    return handleError(e, "read result failed");
  }
}
