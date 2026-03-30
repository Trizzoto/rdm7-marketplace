"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LayoutCard } from "@/components/LayoutCard";
import { SearchBar } from "@/components/SearchBar";
import type { Layout } from "@/lib/supabase";

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "downloads", label: "Most Downloaded" },
  { value: "rating", label: "Highest Rated" },
  { value: "name", label: "Name A-Z" },
];

const ECU_TYPES = ["All", "MaxxECU", "Haltech", "Link", "AEM", "MoTeC", "Ecumaster", "Custom"];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[var(--text-muted)]">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [itemType, setItemType] = useState<string>("all");
  const [price, setPrice] = useState<string>("all");
  const [ecu, setEcu] = useState<string>("All");
  const [sort, setSort] = useState<string>("recent");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setLayouts([]);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);

      let q = supabase
        .from("layouts")
        .select("*, profiles(display_name, avatar_url)")
        .eq("is_published", true)
        .ilike("name", `%${searchTerm}%`);

      if (itemType !== "all") q = q.eq("item_type", itemType);
      if (price === "free") q = q.eq("price", 0);
      if (price === "paid") q = q.gt("price", 0);
      if (ecu !== "All") q = q.eq("ecu_type", ecu);

      switch (sort) {
        case "downloads":
          q = q.order("downloads", { ascending: false });
          break;
        case "rating":
          q = q.order("rating", { ascending: false });
          break;
        case "name":
          q = q.order("name", { ascending: true });
          break;
        default:
          q = q.order("created_at", { ascending: false });
      }

      const { data } = await q.limit(50);
      setLayouts((data as Layout[]) || []);
      setLoading(false);
    },
    [itemType, price, ecu, sort]
  );

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  // Re-fetch when filters change
  useEffect(() => {
    if (query.trim()) {
      fetchResults(query);
    }
  }, [itemType, price, ecu, sort, fetchResults, query]);

  const handleSearchSelect = (term: string) => {
    setQuery(term);
  };

  return (
    <div>
      <h1 className="font-heading text-3xl font-black uppercase tracking-wide mb-6">Search</h1>

      {/* Full-width search bar */}
      <div className="mb-6">
        <SearchBar
          mode="full"
          value={query}
          onChange={setQuery}
          onSelect={handleSearchSelect}
          autoFocus
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Type filter */}
        <div className="flex gap-1">
          {[
            { value: "all", label: "All Types" },
            { value: "layout", label: "Layouts" },
            { value: "dbc", label: "DBC Files" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setItemType(t.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                itemType === t.value
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Price filter */}
        <div className="flex gap-1">
          {[
            { value: "all", label: "All Prices" },
            { value: "free", label: "Free" },
            { value: "paid", label: "Premium" },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPrice(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                price === p.value
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ECU filter */}
        <div className="flex gap-1 flex-wrap">
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

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Result count */}
      {hasSearched && !loading && (
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {layouts.length} result{layouts.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-20 text-[var(--text-muted)]">Searching...</div>
      ) : !hasSearched ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-card border border-[var(--border)]">
          <svg className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="font-heading text-lg font-bold uppercase">Start Searching</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Find layouts, DBC files, and more
          </p>
        </div>
      ) : layouts.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-card border border-[var(--border)]">
          <p className="font-heading text-lg font-bold uppercase">No Results Found</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Try adjusting your search term or filters.
          </p>
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
