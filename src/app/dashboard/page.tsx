"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Layout } from "@/lib/supabase";
import { UploadForm } from "@/components/UploadForm";
import { AuthGuard } from "@/components/AuthGuard";
import Link from "next/link";

type Stats = {
  totalUploads: number;
  totalDownloads: number;
  avgRating: number;
};

type PurchaseRow = {
  amount_cents: number;
  platform_fee_cents: number;
  layout_id: string;
};

function DashboardContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUploads: 0, totalDownloads: 0, avgRating: 0 });
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"layout" | "dbc">("layout");

  // Earnings state
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPlatformFee, setTotalPlatformFee] = useState(0);

  // Price editing state
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchMyLayouts(data.user.id);
        fetchEarnings(data.user.id);
      }
    });
  }, []);

  const fetchEarnings = async (uid: string) => {
    // Get all layouts by this user
    const { data: userLayouts } = await supabase
      .from("layouts")
      .select("id")
      .eq("author_id", uid);

    if (!userLayouts || userLayouts.length === 0) {
      setTotalEarnings(0);
      setTotalSales(0);
      return;
    }

    const layoutIds = userLayouts.map((l) => l.id);

    // Get purchases for these layouts
    const { data: purchases } = await supabase
      .from("purchases")
      .select("amount_cents, platform_fee_cents, layout_id")
      .in("layout_id", layoutIds);

    if (purchases && purchases.length > 0) {
      const rows = purchases as PurchaseRow[];
      const earnings = rows.reduce(
        (sum, p) => sum + (p.amount_cents - p.platform_fee_cents),
        0
      );
      const fees = rows.reduce((sum, p) => sum + p.platform_fee_cents, 0);
      setTotalEarnings(earnings / 100);
      setTotalPlatformFee(fees / 100);
      setTotalSales(rows.length);
    }
  };

  const fetchMyLayouts = useCallback(async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("layouts")
      .select("*")
      .eq("author_id", uid)
      .order("created_at", { ascending: false });

    const items = (data as Layout[]) || [];
    setLayouts(items);

    const totalDownloads = items.reduce((sum, l) => sum + l.downloads, 0);
    const rated = items.filter((l) => l.rating > 0);
    const avgRating = rated.length > 0
      ? rated.reduce((sum, l) => sum + l.rating, 0) / rated.length
      : 0;

    setStats({ totalUploads: items.length, totalDownloads, avgRating });
    setLoading(false);
  }, []);

  const togglePublish = async (layoutId: string, current: boolean) => {
    await supabase.from("layouts").update({ is_published: !current }).eq("id", layoutId);
    if (userId) fetchMyLayouts(userId);
  };

  const deleteLayout = async (layoutId: string) => {
    if (!confirm("Delete this layout permanently?")) return;
    await supabase.from("layouts").delete().eq("id", layoutId);
    if (userId) fetchMyLayouts(userId);
  };

  const startEditPrice = (layout: Layout) => {
    setEditingPrice(layout.id);
    setPriceInput(layout.price.toString());
  };

  const savePrice = async (layoutId: string) => {
    const newPrice = parseFloat(priceInput);
    if (isNaN(newPrice) || newPrice < 0) {
      alert("Please enter a valid price (0 for free)");
      return;
    }

    await supabase
      .from("layouts")
      .update({ price: newPrice })
      .eq("id", layoutId);

    setEditingPrice(null);
    setPriceInput("");
    if (userId) fetchMyLayouts(userId);
  };

  const filteredLayouts = layouts.filter((l) => l.item_type === activeTab);
  const layoutCount = layouts.filter((l) => l.item_type === "layout").length;
  const dbcCount = layouts.filter((l) => l.item_type === "dbc").length;

  const statCards = [
    { label: "TOTAL UPLOADS", value: stats.totalUploads.toString(), color: "var(--accent)" },
    { label: "TOTAL DOWNLOADS", value: stats.totalDownloads.toLocaleString(), color: "#2563EB" },
    { label: "AVG RATING", value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "--", color: "#F59E0B" },
    { label: "EARNINGS", value: totalEarnings > 0 ? `$${totalEarnings.toFixed(2)}` : "--", color: "#10B981" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold uppercase">Creator Dashboard</h1>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-[var(--accent)] text-white font-heading text-sm font-bold uppercase tracking-wider px-5 py-2.5 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
        >
          {showUpload ? "Cancel" : "+ Upload New"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-5"
          >
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">
              {s.label}
            </p>
            <p className="text-3xl font-heading font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Earnings Section */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-bold uppercase">Earnings</h2>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Next payout: every 3 days
          </span>
        </div>

        {totalSales > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Total Sales</p>
              <p className="text-2xl font-heading font-bold">{totalSales}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Your Earnings (85%)</p>
              <p className="text-2xl font-heading font-bold text-green-600">${totalEarnings.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Platform Fee (15%)</p>
              <p className="text-2xl font-heading font-bold text-[var(--text-muted)]">
                ${totalPlatformFee.toFixed(2)}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-[var(--text-muted)] mb-2">No sales yet.</p>
            <p className="text-sm text-[var(--text-muted)]">
              Set a price on your uploads to start earning. Payouts are processed every 3 days.
            </p>
          </div>
        )}
      </div>

      {/* Upload Form */}
      {showUpload && userId && (
        <UploadForm
          userId={userId}
          onSuccess={() => {
            setShowUpload(false);
            fetchMyLayouts(userId);
          }}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveTab("layout")}
          className={`px-5 py-2.5 text-sm font-heading font-bold uppercase tracking-wide rounded-md transition-colors ${
            activeTab === "layout"
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          My Layouts ({layoutCount})
        </button>
        <button
          onClick={() => setActiveTab("dbc")}
          className={`px-5 py-2.5 text-sm font-heading font-bold uppercase tracking-wide rounded-md transition-colors ${
            activeTab === "dbc"
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          My DBC Files ({dbcCount})
        </button>
      </div>

      {/* Items List */}
      {filteredLayouts.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] border border-[var(--border)] rounded-card">
          <p className="text-[var(--text-muted)] mb-2">
            No {activeTab === "dbc" ? "DBC files" : "layouts"} yet.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Upload your first {activeTab === "dbc" ? "DBC file" : "layout"} to share it with the community.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLayouts.map((l) => (
            <div
              key={l.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-4 flex items-center gap-4"
            >
              {/* Thumbnail */}
              <div className="w-28 h-[68px] rounded-lg overflow-hidden bg-[#0a0a0c] flex-shrink-0">
                {l.screenshot_url ? (
                  <img src={l.screenshot_url} alt={l.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-heading text-xs font-bold text-gray-600 uppercase">
                      {l.item_type === "dbc" ? ".dbc" : "No Preview"}
                    </span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/layout-detail/${l.id}`}
                    className="text-sm font-heading font-bold uppercase truncate hover:text-[var(--accent)] transition-colors"
                  >
                    {l.name}
                  </Link>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                      l.item_type === "dbc"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {l.item_type === "dbc" ? "DBC" : "LAYOUT"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span>{l.downloads} downloads</span>
                  {l.item_type === "layout" && <span>{l.widget_count} widgets</span>}
                  {l.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-[var(--accent)]">&#9733;</span> {l.rating.toFixed(1)}
                    </span>
                  )}
                  <span
                    className={`font-medium ${
                      l.is_published ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {l.is_published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="flex-shrink-0 w-28">
                {editingPrice === l.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-[var(--text-muted)]">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePrice(l.id);
                        if (e.key === "Escape") setEditingPrice(null);
                      }}
                      className="w-16 text-sm px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg)] focus:outline-none focus:border-[var(--accent)]"
                      autoFocus
                    />
                    <button
                      onClick={() => savePrice(l.id)}
                      className="text-green-600 hover:text-green-700 transition-colors"
                      title="Save"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditPrice(l)}
                    className="text-sm font-medium hover:text-[var(--accent)] transition-colors"
                    title="Click to set price"
                  >
                    {l.price === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      <span>${l.price.toFixed(2)}</span>
                    )}
                    <span className="text-[10px] text-[var(--text-muted)] ml-1">(edit)</span>
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => togglePublish(l.id, l.is_published)}
                  className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  {l.is_published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => deleteLayout(l.id)}
                  className="text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
