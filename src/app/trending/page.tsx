import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { LayoutCard } from "@/components/LayoutCard";
import type { Layout } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Trending | RDM-7 Marketplace",
  description: "Discover the most popular RDM-7 dashboard layouts and DBC files trending this week.",
};

export const revalidate = 3600; // ISR: revalidate every hour

async function getTrendingLayouts(): Promise<Layout[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("layouts")
    .select("*, profiles(display_name, avatar_url)")
    .eq("is_published", true)
    .order("downloads", { ascending: false })
    .limit(24);

  return (data as Layout[]) || [];
}

export default async function TrendingPage() {
  const layouts = await getTrendingLayouts();

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
            </svg>
          </div>
          <h1 className="font-heading text-3xl font-black uppercase tracking-wide">
            Trending
          </h1>
        </div>
        <p className="text-[var(--text-muted)] text-sm">
          The most popular layouts and DBC files based on download activity.
        </p>
      </div>

      {layouts.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-card border border-[var(--border)]">
          <p className="text-lg font-semibold">No trending items yet.</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Check back soon!</p>
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
