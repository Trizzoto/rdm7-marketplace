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

function DashboardContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUploads: 0, totalDownloads: 0, avgRating: 0 });
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"layout" | "dbc">("layout");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchMyLayouts(data.user.id);
      }
    });
  }, []);

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

  const filteredLayouts = layouts.filter((l) => l.item_type === activeTab);
  const layoutCount = layouts.filter((l) => l.item_type === "layout").length;
  const dbcCount = layouts.filter((l) => l.item_type === "dbc").length;

  const statCards = [
    { label: "TOTAL UPLOADS", value: stats.totalUploads.toString(), color: "var(--accent)" },
    { label: "TOTAL DOWNLOADS", value: stats.totalDownloads.toLocaleString(), color: "#2563EB" },
    { label: "AVG RATING", value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "--", color: "#F59E0B" },
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
      <div className="grid grid-cols-3 gap-4 mb-6">
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
