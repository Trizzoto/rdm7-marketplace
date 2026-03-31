import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe Connect is not used. Payouts are handled manually every 3 days." },
    { status: 400 }
  );
}
