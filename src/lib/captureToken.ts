import crypto from "crypto";

/**
 * Capture tokens — short-lived, signed grants that let RDM Studio post a
 * generated preview back to /api/layout-screenshot WITHOUT Studio needing a
 * Supabase client or login.
 *
 * Flow: the (already authenticated) marketplace dashboard asks /api/capture-token
 * to mint one of these, scoped to {layoutId, userId}, and hands it to Studio in
 * the deep-link. Studio echoes it back with the image; /api/layout-screenshot
 * verifies the HMAC + expiry and derives the owner from the token — no anon key
 * or cross-origin session anywhere in Studio.
 *
 * Format: <base64url(payload)>.<base64url(HMAC-SHA256(payload))> — a minimal
 * stateless JWT-alike. Security rests on the server-only signing secret; the
 * 15-minute TTL bounds replay, and the token is scoped to a single layout.
 */

// Server-only. Falls back to the service-role key so the feature works with no
// extra config, but a dedicated CAPTURE_TOKEN_SECRET is preferred in prod.
const SECRET =
  process.env.CAPTURE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const TTL_SECONDS = 15 * 60;

type CapturePayload = { lid: string; uid: string; exp: number };

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return Buffer.from(t, "base64");
}

function sign(body: string): string {
  return b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
}

export function mintCaptureToken(layoutId: string, userId: string): string {
  const payload: CapturePayload = {
    lid: layoutId,
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

export type CaptureTokenResult =
  | { ok: true; layoutId: string; userId: string }
  | { ok: false; error: string };

export function verifyCaptureToken(token: string): CaptureTokenResult {
  if (!SECRET) return { ok: false, error: "capture signing secret not configured" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, error: "malformed token" };
  const [body, sig] = parts;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "bad signature" };
  }

  let payload: CapturePayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return { ok: false, error: "bad payload" };
  }
  if (!payload.lid || !payload.uid || !payload.exp) {
    return { ok: false, error: "incomplete token" };
  }
  if (Math.floor(Date.now() / 1000) > payload.exp) {
    return { ok: false, error: "token expired — generate a fresh preview link" };
  }
  return { ok: true, layoutId: payload.lid, userId: payload.uid };
}

export const CAPTURE_TOKEN_TTL_SECONDS = TTL_SECONDS;
