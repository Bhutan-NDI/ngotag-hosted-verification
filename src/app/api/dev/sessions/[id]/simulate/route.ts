import { config } from "@/lib/server/config";
import { handleError, json, readJson } from "@/lib/server/http";
import { isSessionId, simulate, toPublic, type SimulateAction } from "@/lib/server/sessions";

const ACTIONS: SimulateAction[] = ["scan", "approve", "decline", "fail", "expire", "timeout", "cancel"];

/** Mock-mode only: fake wallet events to exercise every screen. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!config.mock) return json({ error: "not found" }, 404);
  const { id } = await ctx.params;
  if (!isSessionId(id)) return json({ error: "not found" }, 404);
  const body = await readJson(req);
  const action = body?.action as SimulateAction | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return json({ error: `action must be one of ${ACTIONS.join(", ")}` }, 400);
  }
  try {
    return json(toPublic(await simulate(id, action)));
  } catch (e) {
    return handleError(e, "simulate failed");
  }
}
