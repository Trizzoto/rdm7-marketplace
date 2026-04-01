import { NextResponse } from "next/server";

// Stripe Connect is now handled via /api/connect/onboarding and /api/connect/status
export async function POST() {
  return NextResponse.json(
    { error: "Use /api/connect/onboarding to start Stripe Connect setup" },
    { status: 400 }
  );
}
