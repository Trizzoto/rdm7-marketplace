import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createConnectedAccount, createAccountLink } from "@/lib/stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Check if user already has a connected account
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", userId)
      .single();

    let accountId = profile?.stripe_account_id;

    // Create a new connected account if they don't have one
    if (!accountId) {
      const account = await createConnectedAccount(email);
      accountId = account.id;

      // Save the account ID to the profile
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", userId);
    }

    // Generate an onboarding link (Stripe-hosted page where seller enters their details)
    const accountLink = await createAccountLink(
      accountId,
      `${baseUrl}/settings?stripe=complete`,
      `${baseUrl}/settings?stripe=refresh`
    );

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("Connect onboarding error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create onboarding link" },
      { status: 500 }
    );
  }
}
