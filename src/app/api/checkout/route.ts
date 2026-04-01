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

    // Fetch layout
    const { data: layout, error: layoutErr } = await supabaseAdmin
      .from("layouts")
      .select("id, name, price, author_id")
      .eq("id", layoutId)
      .eq("is_published", true)
      .single();

    if (layoutErr || !layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    if (layout.price <= 0) {
      return NextResponse.json({ error: "This layout is free" }, { status: 400 });
    }

    // Fetch seller's Stripe Connect account (if they have one)
    const { data: sellerProfile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", layout.author_id)
      .single();

    const priceInCents = Math.round(layout.price * 100);

    const session = await createCheckoutSession(
      layoutId,
      priceInCents,
      layout.name,
      buyerEmail,
      sellerProfile?.stripe_account_id
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
