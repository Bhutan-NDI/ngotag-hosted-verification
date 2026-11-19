import { NextResponse } from "next/server";
import { config } from "@/lib/server/config";
import { handleError, json } from "@/lib/server/http";
import { createSession } from "@/lib/server/sessions";

/**
 * Mock-mode only: create a test session and open the hosted page, without
 * needing a partner. The user is sent back to "/" when they leave.
 */
export async function GET() {
  if (!config.mock) return json({ error: "not found" }, 404);
  try {
    const session = await createSession(
      { id: "dev", name: "Test partner", redirectOrigins: [new URL(config.appBaseUrl).origin] },
      { redirectUri: `${config.appBaseUrl}/`, state: "dev" },
    );
    return NextResponse.redirect(new URL(`/v/${session.id}`, config.appBaseUrl), 303);
  } catch (e) {
    return handleError(e, "dev start failed");
  }
}
