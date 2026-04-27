import { NextRequest, NextResponse } from "next/server";
import { validateLayout, validateLayoutString } from "@/lib/widget-schema";

/**
 * POST /api/validate-layout
 *
 * Validates a layout JSON against the canonical widget schema. Used as a
 * stateless pre-flight check from clients (currently `UploadForm.tsx` runs
 * the same validation in-browser; this endpoint exists for any caller that
 * can't run TypeScript locally — e.g. a CI checker, the desktop studio,
 * a future Edge Function).
 *
 * Request body forms (any one of):
 *   { layout: <object> }      — pre-parsed layout
 *   { layout: <string> }      — JSON text
 *   <object>                  — bare layout (top-level fallback)
 *
 * Response shape:
 *   200 { ok: true, stats: {...} }
 *   200 { ok: false, errors: [string, ...] }
 *   400 { ok: false, errors: ["Bad request: ..."] }
 *
 * Note the validation-failure case still returns 200 — the request
 * succeeded; the layout failed. Reserve 4xx/5xx for actual transport
 * problems.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, errors: ["Bad request: body is not valid JSON."] },
      { status: 400 },
    );
  }

  // Unwrap { layout: ... } envelope if present.
  let target: unknown = body;
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "layout" in (body as Record<string, unknown>)
  ) {
    target = (body as Record<string, unknown>).layout;
  }

  const result =
    typeof target === "string"
      ? validateLayoutString(target)
      : validateLayout(target);

  return NextResponse.json(result, { status: 200 });
}
