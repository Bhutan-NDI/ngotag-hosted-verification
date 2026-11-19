import { config } from "@/lib/server/config";
import { clientIp, handleError, json, rateLimited, tooMany } from "@/lib/server/http";
import { log } from "@/lib/server/log";
import { NdiError } from "@/lib/server/ndi";
import { isSessionId, startProof, toPublic } from "@/lib/server/sessions";

/** Create (or re-create after expiry) the NDI proof request for a session. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSessionId(id)) return json({ error: "not found" }, 404);
  if (await rateLimited(`proof:${clientIp(req)}`, config.rateLimit.proofPerMinute)) return tooMany();

  try {
    return json(toPublic(await startProof(id)));
  } catch (e) {
    if (e instanceof NdiError) {
      log.error("proof request failed", { sessionId: id, status: e.status, err: e });
      return json({ error: "identity service unavailable" }, 502);
    }
    return handleError(e, "proof request failed");
  }
}
