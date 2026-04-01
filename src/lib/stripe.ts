const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_API = "https://api.stripe.com/v1";

type StripeResponse<T = Record<string, unknown>> = T & { id: string; error?: { message: string } };

async function stripeRequest<T = Record<string, unknown>>(
  endpoint: string,
  params?: Record<string, string>,
  method: "GET" | "POST" | "DELETE" = "POST"
): Promise<StripeResponse<T>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const body = params ? new URLSearchParams(params).toString() : undefined;

  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    method,
    headers,
    body: method !== "GET" ? body : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe API error: ${res.status}`);
  }

  return data as StripeResponse<T>;
}

// ---------------------------------------------------------------------------
// Checkout Session — uses destination charges when seller has Stripe Connect
// ---------------------------------------------------------------------------

type CheckoutSession = {
  id: string;
  url: string;
};

export async function createCheckoutSession(
  layoutId: string,
  priceInCents: number,
  layoutName: string,
  buyerEmail: string,
  sellerStripeAccountId?: string | null
): Promise<CheckoutSession> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const params: Record<string, string> = {
    mode: "payment",
    "line_items[0][price_data][currency]": "aud",
    "line_items[0][price_data][unit_amount]": priceInCents.toString(),
    "line_items[0][price_data][product_data][name]": layoutName || `RDM-7 Layout: ${layoutId}`,
    "line_items[0][quantity]": "1",
    customer_email: buyerEmail,
    success_url: `${baseUrl}/layout-detail/${layoutId}?purchased=true`,
    cancel_url: `${baseUrl}/layout-detail/${layoutId}`,
    "metadata[layout_id]": layoutId,
    "metadata[buyer_email]": buyerEmail,
  };

  // When the seller has a connected Stripe account, use destination charges:
  // Stripe sends 85% to the seller automatically, platform keeps 15%.
  if (sellerStripeAccountId) {
    const applicationFee = Math.round(priceInCents * 0.15);
    params["payment_intent_data[application_fee_amount]"] = applicationFee.toString();
    params["payment_intent_data[transfer_data][destination]"] = sellerStripeAccountId;
  }

  const session = await stripeRequest<CheckoutSession>("/checkout/sessions", params);
  return session;
}

// ---------------------------------------------------------------------------
// Stripe Connect — account creation & onboarding
// ---------------------------------------------------------------------------

type StripeAccount = {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

export async function createConnectedAccount(email: string): Promise<StripeAccount> {
  return stripeRequest<StripeAccount>("/accounts", {
    type: "express",
    email,
    "capabilities[card_payments][requested]": "true",
    "capabilities[transfers][requested]": "true",
  });
}

export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<{ url: string }> {
  return stripeRequest<{ url: string }>("/account_links", {
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });
}

export async function getConnectedAccount(accountId: string): Promise<StripeAccount> {
  return stripeRequest<StripeAccount>(`/accounts/${accountId}`, undefined, "GET");
}

export async function createLoginLink(accountId: string): Promise<{ url: string }> {
  return stripeRequest<{ url: string }>(`/accounts/${accountId}/login_links`);
}

// ---------------------------------------------------------------------------
// Webhook Signature Verification
// ---------------------------------------------------------------------------

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<Record<string, unknown>> {
  // Parse the Stripe-Signature header
  const parts = signature.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    acc[key.trim()] = value;
    return acc;
  }, {});

  const timestamp = parts["t"];
  const expectedSig = parts["v1"];

  if (!timestamp || !expectedSig) {
    throw new Error("Invalid Stripe signature header");
  }

  // Compute HMAC-SHA256
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedSig !== expectedSig) {
    throw new Error("Webhook signature verification failed");
  }

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    throw new Error("Webhook timestamp outside tolerance");
  }

  return JSON.parse(payload);
}
