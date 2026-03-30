"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AuthGuard } from "@/components/AuthGuard";
import Link from "next/link";

function OnboardingContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check URL params for return from Stripe
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setSuccess(true);
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);

        // Fetch profile to check existing Stripe account
        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_account_id")
          .eq("id", data.user.id)
          .single();

        if (profile?.stripe_account_id) {
          setStripeAccountId(profile.stripe_account_id);
        }
      }
      setLoading(false);
    });
  }, []);

  const handleConnect = async () => {
    if (!userId) return;
    setConnecting(true);

    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start onboarding");
        setConnecting(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Success state after returning from Stripe
  if (success || stripeAccountId) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-3xl font-bold uppercase mb-3">
            {success ? "Stripe Connected!" : "Account Connected"}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Your Stripe account is set up. You can now sell layouts and DBC files on the marketplace.
            Earnings will be deposited directly to your connected bank account.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard"
              className="bg-[var(--accent)] text-white font-heading text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
            >
              Go to Dashboard
            </Link>
            {stripeAccountId && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="border border-[var(--border)] text-[var(--text-muted)] font-heading text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-md hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
              >
                {connecting ? "Loading..." : "Update Stripe Settings"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Initial onboarding state
  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="font-heading text-4xl font-bold uppercase mb-3 text-center">
        Become a Seller
      </h1>
      <p className="text-center text-[var(--text-muted)] mb-10">
        Connect your Stripe account to start earning from your layouts and DBC files.
      </p>

      <div className="grid gap-6 mb-10">
        {/* Feature cards */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[var(--accent)]">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold uppercase mb-1">Earn Revenue</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Set your own prices for layouts and DBC files. You keep 85% of every sale.
              The platform takes a 15% fee to cover hosting, payment processing, and platform maintenance.
            </p>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold uppercase mb-1">Fast Payouts</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Powered by Stripe Express. Receive payouts directly to your bank account
              on a rolling basis. No invoicing needed.
            </p>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold uppercase mb-1">Secure Payments</h3>
            <p className="text-sm text-[var(--text-muted)]">
              All transactions are handled by Stripe. We never see your bank details.
              Buyers pay securely via Stripe Checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 mb-8">
        <h3 className="font-heading text-lg font-bold uppercase mb-4">Fee Breakdown</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Sale price (you set this)</span>
            <span className="font-medium">$10.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Platform fee (15%)</span>
            <span className="font-medium text-[var(--accent)]">-$1.50</span>
          </div>
          <div className="border-t border-[var(--border)] pt-3 flex justify-between">
            <span className="font-medium">Your earnings</span>
            <span className="font-bold text-green-600">$8.50</span>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Stripe processing fees (~1.75% + $0.30) are included in the platform fee.
        </p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="bg-[var(--accent)] text-white font-heading text-lg font-bold uppercase tracking-wider px-10 py-4 rounded-md hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connecting...
            </span>
          ) : (
            "Connect Stripe Account"
          )}
        </button>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          You will be redirected to Stripe to complete setup.
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  );
}
