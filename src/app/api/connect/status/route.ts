import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getConnectedAccount } from "@/lib/stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      });
    }

    const account = await getConnectedAccount(profile.stripe_account_id);

    return NextResponse.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (err) {
    console.error("Connect status error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to check status" },
      { status: 500 }
    );
  }
}
