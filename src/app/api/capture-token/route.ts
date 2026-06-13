import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mintCaptureToken, CAPTURE_TOKEN_TTL_SECONDS } from "@/lib/captureToken";

/**
 * POST /api/capture-token
 *
 * Same-origin endpoint called by the dashboard. Given the signed-in user's
 * Supabase access token (Bearer) and a layoutId they own, returns a short-lived
 * capture token that RDM Studio can echo back to /api/layout-screenshot to set
 * the layout's preview — so Studio never needs Supabase auth of its own.
 *
 * Request: Authorization: Bearer <access_token>, body { layoutId }
 * Response: 200 { ok: true, token, expiresIn } | 4xx { ok: false, error }
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const fail = (status: number, error: string) =>
    NextResponse.json({ ok: false, error }, { status });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) return fail(401, "Missing Authorization: Bearer <access_token>.");

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return fail(401, "Invalid or expired access token.");
  const userId = userData.user.id;

  let body: { layoutId?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Body is not valid JSON.");
  }
  const layoutId = typeof body.layoutId === "string" ? body.layoutId.trim() : "";
  if (!layoutId) return fail(400, "layoutId is required.");

  const { data: layout, error: lookupErr } = await supabaseAdmin
    .from("layouts")
    .select("id, author_id")
    .eq("id", layoutId)
    .single();
  if (lookupErr || !layout) return fail(404, "Layout not found.");
  if (layout.author_id !== userId) return fail(403, "You do not own this layout.");

  return NextResponse.json({
    ok: true,
    token: mintCaptureToken(layoutId, userId),
    expiresIn: CAPTURE_TOKEN_TTL_SECONDS,
  });
}
