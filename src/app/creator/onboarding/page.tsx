"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ConnectStatus = {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

function OnboardingContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setEmail(data.user.email || null);
        fetchStatus(data.user.id);
      }
    });
  }, []);

  const fetchStatus = async (uid: string) => {
    try {
      const res = await fetch(`/api/connect/status?userId=${uid}`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!userId || !email) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/connect/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start onboarding");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const isFullyConnected = status?.connected && status?.charges_enabled && status?.payouts_enabled;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="font-heading text-4xl font-bold uppercase mb-3 text-center">
        Sell Your Designs
      </h1>
      <p className="text-center text-[var(--text-muted)] mb-10">
        Set a price on your layouts and DBC files. Stripe handles all payments — you get paid directly.
      </p>

      <div className="grid gap-6 mb-10">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[var(--accent)]">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold uppercase mb-1">Platform Fee: 15%</h3>
            <p className="text-sm text-[var(--text-muted)]">
              You keep 85% of every sale. The platform takes a 15% fee to cover hosting,
              payment processing, and platform maintenance.
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
            <h3 className="font-heading text-lg font-bold uppercase mb-1">Automatic Payouts</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Stripe sends your earnings directly to your bank account on a rolling basis.
              No manual processing, no invoicing needed.
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
            <h3 className="font-heading text-lg font-bold uppercase mb-1">Secure & Private</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Your bank details are entered on Stripe&apos;s secure platform — we never see
              or store your financial information.
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
      </div>

      {/* Stripe Connect Status & CTA */}
      <div className="text-center">
        {isFullyConnected ? (
          <>
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 font-medium text-sm px-6 py-3 rounded-lg mb-4">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Stripe account connected — you&apos;re ready to sell!
            </div>
            <div>
              <Link
                href="/dashboard"
                className="inline-block bg-[var(--accent)] text-white font-heading text-lg font-bold uppercase tracking-wider px-10 py-4 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </>
        ) : status?.connected && !status?.charges_enabled ? (
          <>
            <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 font-medium text-sm px-6 py-3 rounded-lg mb-4">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Stripe setup incomplete — please finish onboarding
            </div>
            <div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-block bg-[#635BFF] text-white font-heading text-lg font-bold uppercase tracking-wider px-10 py-4 rounded-md hover:bg-[#5349E0] transition-colors disabled:opacity-50"
              >
                {connecting ? "Redirecting..." : "Continue Stripe Setup"}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-block bg-[#635BFF] text-white font-heading text-lg font-bold uppercase tracking-wider px-10 py-4 rounded-md hover:bg-[#5349E0] transition-colors disabled:opacity-50"
            >
              {connecting ? "Redirecting..." : "Connect with Stripe"}
            </button>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              You&apos;ll be redirected to Stripe to set up your account securely.
            </p>
          </>
        )}
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
