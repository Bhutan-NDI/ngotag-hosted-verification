import { config } from "@/lib/server/config";
import { handleError, json, rateLimited, readJson, tooMany } from "@/lib/server/http";
import { createSession, partnerFromAuth } from "@/lib/server/sessions";
import type { ProofAttribute } from "@/lib/server/config";

/**
 * Partner API — create a hosted verification session.
 *
 *   POST /api/sessions
 *   Authorization: Bearer <partner apiKey>
 *   { "redirectUri": "https://...", "state": "opaque",
 *     "proofName"?: "...", "proofAttributes"?: [...] }
 *
 *   201 { "id": "...", "url": "https://<host>/v/<id>", "expiresAt": <epoch ms> }
 */
export async function POST(req: Request) {
  const partner = partnerFromAuth(req.headers.get("authorization"));
  if (!partner) return json({ error: "unauthorized" }, 401);
  if (await rateLimited(`create:${partner.id}`, config.rateLimit.createPerMinute)) return tooMany();

  const body = await readJson(req);
  if (!body) return json({ error: "invalid JSON body" }, 400);

  try {
    const s = await createSession(partner, {
      redirectUri: String(body.redirectUri ?? ""),
      state: body.state as string | undefined,
      proofName: body.proofName as string | undefined,
      proofAttributes: body.proofAttributes as ProofAttribute[] | undefined,
    });
    return json({ id: s.id, url: `${config.appBaseUrl}/v/${s.id}`, expiresAt: s.sessionExpiresAt }, 201);
  } catch (e) {
    return handleError(e, "create session failed");
  }
}
