"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Layout } from "@/lib/supabase";

const ADMIN_EMAILS = ["admin@rdm7.com.au"];

type Stats = {
  totalLayouts: number;
  totalDbc: number;
  totalDownloads: number;
  totalUsers: number;
};

type RecentUpload = Layout & {
  profiles?: { display_name: string; avatar_url: string | null };
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalLayouts: 0, totalDbc: 0, totalDownloads: 0, totalUsers: 0 });
  const [recent, setRecent] = useState<RecentUpload[]>([]);
  const [featureId, setFeatureId] = useState("");
  const [removeId, setRemoveId] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user || !ADMIN_EMAILS.includes(data.user.email || "")) {
      window.location.href = "/";
      return;
    }
    setAuthorized(true);
    setLoading(false);
    fetchStats();
    fetchRecent();
  };

  const fetchStats = async () => {
    const [layoutRes, dbcRes, usersRes] = await Promise.all([
      supabase.from("layouts").select("downloads", { count: "exact" }).eq("item_type", "layout"),
      supabase.from("layouts").select("downloads", { count: "exact" }).eq("item_type", "dbc"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const layouts = layoutRes.data || [];
    const dbcs = dbcRes.data || [];
    const totalDownloads = [...layouts, ...dbcs].reduce(
      (sum, r: { downloads: number }) => sum + (r.downloads || 0),
      0
    );

    setStats({
      totalLayouts: layoutRes.count || 0,
      totalDbc: dbcRes.count || 0,
      totalDownloads,
      totalUsers: usersRes.count || 0,
    });
  };

  const fetchRecent = useCallback(async () => {
    const { data } = await supabase
      .from("layouts")
      .select("*, profiles(display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(20);
    setRecent((data as RecentUpload[]) || []);
  }, []);

  const handleApprove = async (id: string) => {
    await supabase.from("layouts").update({ is_published: true }).eq("id", id);
    fetchRecent();
  };

  const handleReject = async (id: string) => {
    await supabase.from("layouts").update({ is_published: false }).eq("id", id);
    fetchRecent();
  };

  const handleFeature = async () => {
    if (!featureId.trim()) return;
    const { error } = await supabase
      .from("layouts")
      .update({ is_published: true })
      .eq("id", featureId.trim());
    setActionMsg(error ? "Error: " + error.message : "Layout featured successfully.");
    setFeatureId("");
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleRemove = async () => {
    if (!removeId.trim()) return;
    if (!confirm("Remove this listing permanently?")) return;
    const { error } = await supabase.from("layouts").delete().eq("id", removeId.trim());
    setActionMsg(error ? "Error: " + error.message : "Listing removed successfully.");
    setRemoveId("");
    fetchRecent();
    fetchStats();
    setTimeout(() => setActionMsg(""), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) return null;

  const statCards = [
    { label: "TOTAL LAYOUTS", value: stats.totalLayouts, color: "var(--accent)" },
    { label: "TOTAL DBC FILES", value: stats.totalDbc, color: "#2563EB" },
    { label: "TOTAL DOWNLOADS", value: stats.totalDownloads, color: "#16A34A" },
    { label: "TOTAL USERS", value: stats.totalUsers, color: "#9333EA" },
  ];

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold uppercase mb-8">Admin Console</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-5"
          >
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">
              {s.label}
            </p>
            <p className="text-3xl font-heading font-bold" style={{ color: s.color }}>
              {s.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Uploads Table */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-card mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-heading text-lg font-bold uppercase">Recent Uploads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Author</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {recent.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="px-4 py-3 font-medium truncate max-w-[200px]">{item.name}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {item.profiles?.display_name || "Unknown"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.item_type === "dbc"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.item_type === "dbc" ? "DBC" : "LAYOUT"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${
                        item.is_published ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      {item.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!item.is_published && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="text-xs px-3 py-1 rounded border border-green-300 text-green-600 hover:bg-green-50 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {item.is_published && (
                        <button
                          onClick={() => handleReject(item.id)}
                          className="text-xs px-3 py-1 rounded border border-yellow-300 text-yellow-600 hover:bg-yellow-50 transition-colors"
                        >
                          Unpublish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    No uploads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6">
        <h2 className="font-heading text-lg font-bold uppercase mb-5">Quick Actions</h2>

        {actionMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4">
            {actionMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Feature a Layout */}
          <div className="border border-[var(--border)] rounded-lg p-4">
            <h3 className="font-heading text-sm font-bold uppercase mb-3">Feature a Layout</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={featureId}
                onChange={(e) => setFeatureId(e.target.value)}
                placeholder="Layout ID"
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={handleFeature}
                className="bg-[var(--accent)] text-white font-bold text-xs uppercase px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
              >
                Feature
              </button>
            </div>
          </div>

          {/* Remove a Listing */}
          <div className="border border-[var(--border)] rounded-lg p-4">
            <h3 className="font-heading text-sm font-bold uppercase mb-3">Remove a Listing</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={removeId}
                onChange={(e) => setRemoveId(e.target.value)}
                placeholder="Layout ID"
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={handleRemove}
                className="bg-red-600 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
