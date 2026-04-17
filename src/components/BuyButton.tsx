"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { OpenInStudioButton } from "./OpenInStudioButton";

type BuyButtonProps = {
  layoutId: string;
  rdmUrl: string | null;
  name: string;
  price: number;
  itemType?: string;
};

export function BuyButton({ layoutId, rdmUrl, name, price, itemType }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const ext = itemType === "dbc" ? ".dbc" : ".rdm";
  const isFree = price === 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchased") === "true") {
      setPurchased(true);
      setCheckingPurchase(false);
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setUserEmail(data.user.email ?? null);

        if (!isFree) {
          const { data: purchase } = await supabase
            .from("purchases")
            .select("id")
            .eq("buyer_id", data.user.id)
            .eq("layout_id", layoutId)
            .maybeSingle();

          if (purchase) setPurchased(true);
        }
      }
      setCheckingPurchase(false);
    });
  }, [layoutId, isFree]);

  const handleDownload = async () => {
    if (!rdmUrl) return;
    setLoading(true);
    try {
      // Increment download counter
      try { await supabase.rpc("increment_downloads", { layout_id: layoutId }); } catch { /* ok */ }

      // Fetch the file as a blob to force download (cross-origin URLs don't trigger download with <a>)
      const response = await fetch(rdmUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(rdmUrl, "_blank");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!userEmail) {
      window.location.href = `/auth/login?redirect=/layout-detail/${layoutId}`;
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layoutId, buyerEmail: userEmail }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
        setLoading(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoading(false);
    }
  };

  // Free item — skip Studio buttons for DBC files since Studio imports .rdm only
  if (isFree) {
    return (
      <>
        <button
          onClick={handleDownload}
          disabled={!rdmUrl || loading}
          className="w-full bg-[var(--accent)] text-white font-heading font-bold py-3 rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm tracking-wide"
        >
          {loading ? "Downloading..." : "Download"}
        </button>
        {itemType !== "dbc" && (
          <OpenInStudioButton layoutId={layoutId} rdmUrl={rdmUrl} name={name} isAccessible={true} />
        )}
      </>
    );
  }

  // Checking purchase
  if (checkingPurchase) {
    return (
      <button disabled className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] font-bold py-3 rounded-lg uppercase text-sm tracking-wide">
        Loading...
      </button>
    );
  }

  // Already purchased
  if (purchased) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 justify-center text-sm text-green-600 font-medium mb-1">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Purchased
        </div>
        <button
          onClick={handleDownload}
          disabled={!rdmUrl || loading}
          className="w-full bg-[var(--accent)] text-white font-heading font-bold py-3 rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm tracking-wide"
        >
          {loading ? "Downloading..." : "Download"}
        </button>
        {itemType !== "dbc" && (
          <OpenInStudioButton layoutId={layoutId} rdmUrl={rdmUrl} name={name} isAccessible={true} />
        )}
      </div>
    );
  }

  // Not purchased — buy button + locked preview
  return (
    <>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full bg-[var(--accent)] text-white font-heading font-bold py-3 rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm tracking-wide flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Buy ${price.toFixed(2)}
          </>
        )}
      </button>
      {itemType !== "dbc" && (
        <OpenInStudioButton layoutId={layoutId} rdmUrl={rdmUrl} name={name} isAccessible={false} locked={true} />
      )}
    </>
  );
}
