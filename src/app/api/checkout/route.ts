import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createCheckoutSession } from "@/lib/stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { layoutId, buyerEmail } = await req.json();

    if (!layoutId || !buyerEmail) {
      return NextResponse.json(
        { error: "layoutId and buyerEmail are required" },
        { status: 400 }
      );
    }

    // Fetch layout with seller profile
    const { data: layout, error: layoutErr } = await supabaseAdmin
      .from("layouts")
      .select("*, profiles(stripe_account_id)")
      .eq("id", layoutId)
      .eq("is_published", true)
      .single();

    if (layoutErr || !layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    if (layout.price <= 0) {
      return NextResponse.json({ error: "This layout is free" }, { status: 400 });
    }

    const sellerStripeId = layout.profiles?.stripe_account_id;
    if (!sellerStripeId) {
      return NextResponse.json(
        { error: "Seller has not connected their Stripe account" },
        { status: 400 }
      );
    }

    const priceInCents = Math.round(layout.price * 100);

    const session = await createCheckoutSession(
      layoutId,
      priceInCents,
      sellerStripeId,
      buyerEmail,
      layout.name
    );

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
