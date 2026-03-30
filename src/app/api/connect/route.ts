import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createConnectAccount, createConnectAccountLink } from "@/lib/stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Get user profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, stripe_account_id")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get user email from auth
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authData?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    let stripeAccountId = profile.stripe_account_id;

    // Create Stripe Express account if user doesn't have one
    if (!stripeAccountId) {
      const account = await createConnectAccount(email);
      stripeAccountId = account.id;

      // Save Stripe account ID to profile
      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_account_id: stripeAccountId })
        .eq("id", userId);

      if (updateErr) {
        console.error("Failed to update profile with Stripe account:", updateErr);
        return NextResponse.json(
          { error: "Failed to save Stripe account" },
          { status: 500 }
        );
      }
    }

    // Generate onboarding link
    const onboardingUrl = await createConnectAccountLink(stripeAccountId, userId);

    return NextResponse.json({ url: onboardingUrl, accountId: stripeAccountId });
  } catch (err) {
    console.error("Connect error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Connect setup failed" },
      { status: 500 }
    );
  }
}
