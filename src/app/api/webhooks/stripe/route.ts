import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    let event: Record<string, unknown>;
    try {
      event = await verifyWebhookSignature(body, signature, WEBHOOK_SECRET);
    } catch {
      console.error("Webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const eventType = event.type as string;

    if (eventType === "checkout.session.completed") {
      const session = event.data as { object: Record<string, unknown> };
      const sessionObj = session.object;

      const layoutId = (sessionObj.metadata as Record<string, string>)?.layout_id;
      const buyerEmail = (sessionObj.metadata as Record<string, string>)?.buyer_email;
      const sessionId = sessionObj.id as string;
      const amountTotal = sessionObj.amount_total as number;

      if (!layoutId) {
        console.error("No layout_id in session metadata");
        return NextResponse.json({ received: true });
      }

      // Resolve buyer by email
      const { data: buyerProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", (
          await supabaseAdmin.auth.admin.listUsers()
        ).data.users.find((u) => u.email === buyerEmail)?.id ?? "")
        .single();

      const buyerId = buyerProfile?.id ?? null;
      const platformFee = Math.round(amountTotal * 0.15);

      // Insert purchase record
      const { error: purchaseErr } = await supabaseAdmin
        .from("purchases")
        .upsert(
          {
            buyer_id: buyerId,
            layout_id: layoutId,
            stripe_session_id: sessionId,
            amount_cents: amountTotal,
            platform_fee_cents: platformFee,
          },
          { onConflict: "buyer_id,layout_id" }
        );

      if (purchaseErr) {
        console.error("Failed to record purchase:", purchaseErr);
      }

      // Increment download count on the layout
      await supabaseAdmin.rpc("increment_downloads", { layout_id: layoutId });

      console.log(`Payment completed: layout=${layoutId} amount=${amountTotal} buyer=${buyerEmail}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
