"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getFavorites } from "@/lib/favorites";
import { LayoutCard } from "@/components/LayoutCard";
import { AuthGuard } from "@/components/AuthGuard";
import type { Layout } from "@/lib/supabase";
import Link from "next/link";

function CollectionsContent() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    const ids = getFavorites();
    if (ids.length === 0) {
      setLayouts([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("layouts")
      .select("*, profiles(display_name, avatar_url)")
      .in("id", ids)
      .eq("is_published", true);
    setLayouts((data as Layout[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFavorites();

    const handler = () => fetchFavorites();
    window.addEventListener("favorites-changed", handler);
    return () => window.removeEventListener("favorites-changed", handler);
  }, [fetchFavorites]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (layouts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto mb-6">
          <svg className="w-9 h-9 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
        <h2 className="font-heading text-xl font-bold uppercase mb-2">No Favorites Yet</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
          Browse layouts and click the heart icon to save them to your collection.
        </p>
        <Link
          href="/browse?type=layout"
          className="inline-block bg-[var(--accent)] text-white font-heading text-sm font-bold uppercase tracking-wider px-8 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
        >
          Browse Layouts
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[var(--text-muted)]">
          {layouts.length} saved {layouts.length === 1 ? "item" : "items"}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {layouts.map((layout) => (
          <LayoutCard key={layout.id} layout={layout} />
        ))}
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-black uppercase tracking-wide">
          My Favorites
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Your saved layouts and DBC files, all in one place.
        </p>
      </div>
      <AuthGuard>
        <CollectionsContent />
      </AuthGuard>
    </div>
  );
}
