"use client";

import { AuthGuard } from "@/components/AuthGuard";
import Link from "next/link";

function OnboardingContent() {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <h1 className="font-heading text-4xl font-bold uppercase mb-3 text-center">
        Sell Your Designs
      </h1>
      <p className="text-center text-[var(--text-muted)] mb-10">
        Set a price on your layouts and DBC files. When someone buys your design, we handle the payment.
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
            <h3 className="font-heading text-lg font-bold uppercase mb-1">Payouts Every 3 Days</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Payouts are processed every 3 days via bank transfer or PayPal.
              No invoicing needed.
            </p>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold uppercase mb-1">Add Your Payment Details</h3>
            <p className="text-sm text-[var(--text-muted)]">
              To receive payouts, add your payment details in Settings.
              We support PayPal and direct bank transfer.
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

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/settings"
          className="inline-block bg-[var(--accent)] text-white font-heading text-lg font-bold uppercase tracking-wider px-10 py-4 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
        >
          Go to Settings
        </Link>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Add your PayPal or bank details to start receiving payouts.
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
