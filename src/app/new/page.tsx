import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { LayoutCard } from "@/components/LayoutCard";
import type { Layout } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "New Arrivals | RDM-7 Marketplace",
  description: "Browse the latest dashboard layouts and DBC files published on the RDM-7 Marketplace.",
};

export const revalidate = 1800; // ISR: revalidate every 30 minutes

async function getNewLayouts(): Promise<Layout[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("layouts")
    .select("*, profiles(display_name, avatar_url)")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(24);

  return (data as Layout[]) || [];
}

export default async function NewArrivalsPage() {
  const layouts = await getNewLayouts();

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <h1 className="font-heading text-3xl font-black uppercase tracking-wide">
            New Arrivals
          </h1>
        </div>
        <p className="text-[var(--text-muted)] text-sm">
          The freshest layouts and DBC files, just published by the community.
        </p>
      </div>

      {layouts.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-card border border-[var(--border)]">
          <p className="text-lg font-semibold">No layouts published yet.</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Be the first to publish!</p>
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
