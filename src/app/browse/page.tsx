"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LayoutCard } from "@/components/LayoutCard";
import type { Layout } from "@/lib/supabase";

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "downloads", label: "Most Downloaded" },
  { value: "rating", label: "Highest Rated" },
  { value: "name", label: "Name A-Z" },
];

const ECU_TYPES = ["All", "MaxxECU", "Haltech", "Link", "AEM", "MoTeC", "Ecumaster", "Custom"];

export default function BrowsePage() {
  return <Suspense fallback={<div className="text-center py-20 text-[var(--text-muted)]">Loading...</div>}><BrowseContent /></Suspense>;
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState(searchParams.get("type") || "layout");
  const [price, setPrice] = useState(searchParams.get("price") || "all");
  const [ecu, setEcu] = useState(searchParams.get("ecu") || "All");
  const [sort, setSort] = useState(searchParams.get("sort") || "recent");

  const fetchLayouts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("layouts")
      .select("*, profiles(display_name, avatar_url)")
      .eq("is_published", true)
      .eq("item_type", itemType);

    if (price === "free") query = query.eq("price", 0);
    if (price === "paid") query = query.gt("price", 0);
    if (ecu !== "All" && itemType === "layout") query = query.eq("ecu_type", ecu);
    if (search) query = query.ilike("name", `%${search}%`);

    switch (sort) {
      case "downloads": query = query.order("downloads", { ascending: false }); break;
      case "rating": query = query.order("rating", { ascending: false }); break;
      case "name": query = query.order("name", { ascending: true }); break;
      default: query = query.order("created_at", { ascending: false });
    }

    const { data } = await query.limit(50);
    setLayouts((data as Layout[]) || []);
    setLoading(false);
  }, [itemType, price, ecu, sort, search]);

  useEffect(() => { fetchLayouts(); }, [fetchLayouts]);

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">
        Browse {itemType === "dbc" ? "DBC Files" : "Layouts"}
      </h1>

      {/* Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setItemType("layout")}
          className={`px-5 py-2 text-sm font-bold rounded-md transition-colors ${
            itemType === "layout"
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]"
          }`}
        >
          Layouts
        </button>
        <button
          onClick={() => setItemType("dbc")}
          className={`px-5 py-2 text-sm font-bold rounded-md transition-colors ${
            itemType === "dbc"
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]"
          }`}
        >
          DBC Files
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          type="text"
          placeholder={`Search ${itemType === "dbc" ? "DBC files" : "layouts"}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] w-64 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
        />

        {/* Price filter */}
        <div className="flex gap-1">
          {["all", "free", "paid"].map((p) => (
            <button
              key={p}
              onClick={() => setPrice(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors capitalize ${
                price === p
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
              }`}
            >
              {p === "all" ? "All" : p === "free" ? "Free" : "Premium"}
            </button>
          ))}
        </div>

        {/* ECU filter (layouts only) */}
        {itemType === "layout" && (
          <div className="flex gap-1">
            {ECU_TYPES.map((e) => (
              <button
                key={e}
                onClick={() => setEcu(e)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  ecu === e
                    ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-[var(--text-muted)]">Loading...</div>
      ) : layouts.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
          <p className="text-lg font-semibold">No {itemType === "dbc" ? "DBC files" : "layouts"} found.</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {layouts.map((layout) => (
            <LayoutCard key={layout.id} layout={layout} />
          ))}
        </div>
      )}
    </div>
  );
}
