import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCaptureToken } from "@/lib/captureToken";

/**
 * POST /api/layout-screenshot
 *
 * Receives an auto-generated preview image for a layout (produced by RDM
 * Studio, which runs the WASM simulation, drives the dash to a deterministic
 * "demo pose", and captures the canvas), stores it in the public `screenshots`
 * bucket, and points the layout's `screenshot_url` at it.
 *
 * Why this lives here and not in the upload form: the marketplace has no
 * renderer. The simulation/rendering engine is in Studio. So Studio is the
 * thing that can produce a real preview frame, and it hands the result back
 * to us through this endpoint.
 *
 * Auth: the caller (Studio, a different origin) must send the signed-in user's
 * Supabase access token as `Authorization: Bearer <token>`. We resolve the
 * user from that token and require they OWN the target layout — only the
 * author can set its preview. Storage writes then go through the service-role
 * client (after ownership is proven), so the cross-origin caller never needs
 * storage RLS to evaluate its JWT.
 *
 * Request body (JSON):
 *   { layoutId: string, image: "data:image/png;base64,..." }
 *   `image` may also be a bare base64 string; PNG / JPEG / WebP are accepted.
 *
 * Response:
 *   200 { ok: true, screenshotUrl }
 *   400 { ok: false, error }   — bad request / unsupported image
 *   401 { ok: false, error }   — missing/invalid token
 *   403 { ok: false, error }   — caller doesn't own the layout
 *   404 { ok: false, error }   — layout not found
 *   413 { ok: false, error }   — image too large
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Origins allowed to call this endpoint cross-site. Studio is the real caller;
// localhost entries let the flow be exercised in dev.
const ALLOWED_ORIGINS = new Set([
  "https://studio.realtimedatamonitoring.com.au",
  "http://localhost:3000",
  "http://localhost:3002", // local Studio dev server (npx serve … -l 3002)
  "http://localhost:5173",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — generous for a 1024px-ish PNG

function corsHeaders(origin: string | null): Record<string, string> {
  // Echo the origin only if it's allow-listed; otherwise omit the header so
  // the browser blocks the cross-site read.
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/** Sniff the image type from magic bytes. Returns null for anything we don't accept. */
function detectImage(buf: Buffer): { contentType: string; ext: string } | null {
  if (buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { contentType: "image/png", ext: "png" };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { contentType: "image/jpeg", ext: "jpg" };
  }
  if (buf.length >= 12 &&
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP") {
    return { contentType: "image/webp", ext: "webp" };
  }
  return null;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req.headers.get("origin"));
  const fail = (status: number, error: string) =>
    NextResponse.json({ ok: false, error }, { status, headers: cors });

  // --- Parse + validate the request body ----------------------------------
  let body: { layoutId?: unknown; image?: unknown; captureToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Body is not valid JSON.");
  }

  const layoutId = typeof body.layoutId === "string" ? body.layoutId.trim() : "";
  const image = typeof body.image === "string" ? body.image : "";
  const captureToken = typeof body.captureToken === "string" ? body.captureToken : "";
  if (!layoutId) return fail(400, "layoutId is required.");
  if (!image) return fail(400, "image is required (data URL or base64 PNG/JPEG/WebP).");

  // --- Auth: resolve the user from a capture token OR a bearer token -------
  // Studio uses a short-lived capture token (no Supabase client needed); the
  // bearer path stays for same-project callers / future headless workers.
  let userId: string;
  if (captureToken) {
    const v = verifyCaptureToken(captureToken);
    if (!v.ok) return fail(401, `Capture token: ${v.error}`);
    if (v.layoutId !== layoutId) return fail(403, "Capture token does not match layoutId.");
    userId = v.userId;
  } else {
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!bearer) {
      return fail(401, "Provide a captureToken in the body, or Authorization: Bearer <access_token>.");
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(bearer);
    if (userErr || !userData?.user) return fail(401, "Invalid or expired access token.");
    userId = userData.user.id;
  }

  // Strip a data-URL prefix if present, then decode.
  const base64 = image.startsWith("data:")
    ? image.slice(image.indexOf(",") + 1)
    : image;
  let buf: Buffer;
  try {
    buf = Buffer.from(base64, "base64");
  } catch {
    return fail(400, "image is not valid base64.");
  }
  if (buf.length === 0) return fail(400, "Decoded image is empty.");
  if (buf.length > MAX_IMAGE_BYTES) return fail(413, "Image exceeds 5 MB.");

  const kind = detectImage(buf);
  if (!kind) return fail(400, "Unsupported image format — use PNG, JPEG, or WebP.");

  // --- Ownership: only the layout's author may set its preview ------------
  const { data: layout, error: lookupErr } = await supabaseAdmin
    .from("layouts")
    .select("id, author_id")
    .eq("id", layoutId)
    .single();
  if (lookupErr || !layout) return fail(404, "Layout not found.");
  if (layout.author_id !== userId) return fail(403, "You do not own this layout.");

  // --- Store the image (service role; ownership already proven) -----------
  // Path mirrors the upload-form convention: <author_id>/<...>. Unique suffix
  // avoids collisions; the `studio` marker distinguishes auto-generated shots.
  const stamp = `${userId.slice(0, 8)}-${buf.length}`;
  const path = `${layout.author_id}/studio-${layoutId}-${stamp}.${kind.ext}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from("screenshots")
    .upload(path, buf, { contentType: kind.contentType, upsert: true });
  if (upErr) return fail(400, `Storage upload failed: ${upErr.message}`);

  const { data: pub } = supabaseAdmin.storage.from("screenshots").getPublicUrl(path);
  const screenshotUrl = pub.publicUrl;

  // --- Point the layout at the new preview --------------------------------
  const { error: updErr } = await supabaseAdmin
    .from("layouts")
    .update({ screenshot_url: screenshotUrl })
    .eq("id", layoutId);
  if (updErr) return fail(400, `Failed to update layout: ${updErr.message}`);

  return NextResponse.json({ ok: true, screenshotUrl }, { status: 200, headers: cors });
}
