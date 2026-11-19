import { config } from "@/lib/server/config";
import { handleError, json, readJson } from "@/lib/server/http";
import { log } from "@/lib/server/log";
import { parseWebhook } from "@/lib/server/ndi";
import { applyWebhook, bearerMatches } from "@/lib/server/sessions";

/** Receives proof events from Bhutan NDI for subscribed threads. */
export async function POST(req: Request) {
  if (!bearerMatches(req.headers.get("authorization"), config.ndi.webhookToken)) {
    log.warn("webhook rejected: bad token");
    return json({ error: "unauthorized" }, 401);
  }
  const body = await readJson(req, 512 * 1024);
  if (!body) return json({ error: "invalid JSON body" }, 400);

  const evt = parseWebhook(body);
  if (!evt) {
    log.info("webhook ignored", { type: String(body.type ?? "") });
    // Acknowledge unknown events so NDI doesn't retry them forever.
    return json({ ok: true, ignored: true });
  }
  try {
    return json({ ok: true, applied: await applyWebhook(evt) });
  } catch (e) {
    // 500 lets NDI retry on transient storage errors.
    return handleError(e, "webhook processing failed");
  }
}
