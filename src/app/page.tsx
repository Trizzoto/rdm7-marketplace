import { supabase } from "@/lib/supabase";
import { LayoutCard } from "@/components/LayoutCard";
import Link from "next/link";
import type { Layout } from "@/lib/supabase";

export const revalidate = 60;

async function getItems(type: string, sort: string, limit: number, priceFilter?: "free" | "paid"): Promise<Layout[]> {
  let query = supabase
    .from("layouts")
    .select("*, profiles(display_name, avatar_url)")
    .eq("is_published", true)
    .eq("item_type", type);

  if (priceFilter === "free") query = query.eq("price", 0);
  if (priceFilter === "paid") query = query.gt("price", 0);

  switch (sort) {
    case "downloads": query = query.order("downloads", { ascending: false }); break;
    case "rating": query = query.order("rating", { ascending: false }); break;
    default: query = query.order("created_at", { ascending: false });
  }

  const { data } = await query.limit(limit);
  return (data as Layout[]) || [];
}

export default async function HomePage() {
  const [freeLayouts, topRated, mostDownloaded, recentLayouts, freeDbcs, recentDbcs] = await Promise.all([
    getItems("layout", "recent", 4, "free"),
    getItems("layout", "rating", 4),
    getItems("layout", "downloads", 4),
    getItems("layout", "recent", 4),
    getItems("dbc", "recent", 4, "free"),
    getItems("dbc", "downloads", 4),
  ]);

  const hasLayouts = freeLayouts.length > 0 || topRated.length > 0 || mostDownloaded.length > 0;
  const hasDbcs = freeDbcs.length > 0 || recentDbcs.length > 0;

  return (
    <div>
      {/* Hero */}
      <section className="relative text-center py-24 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg)]" />

        <div className="relative z-10">
          <p className="text-[11px] font-bold text-[var(--accent)] tracking-[0.22em] uppercase mb-6">
            &mdash; Community Hub
          </p>
          <h1 className="font-heading text-6xl sm:text-7xl font-bold uppercase mb-5 tracking-tight leading-[0.9]">
            Layout<br />
            <span className="text-[var(--accent)]">Marketplace</span>
          </h1>
          <p className="text-[var(--text-muted)] text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            Browse, download, and share custom dashboard layouts and DBC files for your RDM-7.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/browse?type=layout"
              className="inline-block bg-[var(--accent)] text-white font-heading font-bold text-sm uppercase tracking-wider px-8 py-3.5 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
            >
              Browse Layouts &rarr;
            </Link>
            <Link
              href="/browse?type=dbc"
              className="inline-block bg-[var(--text)] text-white font-heading font-bold text-sm uppercase tracking-wider px-8 py-3.5 rounded-md hover:bg-gray-800 transition-colors"
            >
              Browse DBC Files &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
          {[
            { value: "100%", label: "Customisable" },
            { value: "Free", label: "To Browse" },
            { value: "Open", label: "Community" },
            { value: ".rdm + .dbc", label: "One-Click Install" },
          ].map((stat) => (
            <div key={stat.label} className="border-l-4 border-[var(--accent)] bg-[var(--surface)] px-6 py-5">
              <div className="font-heading text-2xl font-bold uppercase text-[var(--text)]">{stat.value}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1 uppercase tracking-[0.15em] font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Tabs */}
      <section className="flex gap-3 justify-center mb-14 flex-wrap">
        <Link href="/browse?type=layout&price=free" className="px-5 py-2 text-sm font-heading font-semibold uppercase tracking-wider rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
          Free Layouts
        </Link>
        <Link href="/browse?type=layout&price=paid" className="px-5 py-2 text-sm font-heading font-semibold uppercase tracking-wider rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
          Premium Layouts
        </Link>
        <Link href="/browse?type=dbc&price=free" className="px-5 py-2 text-sm font-heading font-semibold uppercase tracking-wider rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
          Free DBC Files
        </Link>
        <Link href="/browse?type=dbc&price=paid" className="px-5 py-2 text-sm font-heading font-semibold uppercase tracking-wider rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
          Premium DBC Files
        </Link>
      </section>

      {/* LAYOUTS SECTION */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="font-heading text-3xl font-bold uppercase">Dashboard Layouts</h2>
          <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded">.rdm</span>
        </div>

        {/* Free Layouts */}
        {freeLayouts.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-xl font-bold uppercase">Free Layouts</h3>
              <Link href="/browse?type=layout&price=free" className="text-sm font-medium text-[var(--accent)] hover:underline">View all &rarr;</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {freeLayouts.map((l) => <LayoutCard key={l.id} layout={l} />)}
            </div>
          </div>
        )}

        {/* Top Rated */}
        {topRated.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-xl font-bold uppercase">Top Rated</h3>
              <Link href="/browse?type=layout&sort=rating" className="text-sm font-medium text-[var(--accent)] hover:underline">View all &rarr;</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {topRated.map((l) => <LayoutCard key={l.id} layout={l} />)}
            </div>
          </div>
        )}

        {/* Most Downloaded */}
        {mostDownloaded.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-xl font-bold uppercase">Most Downloaded</h3>
              <Link href="/browse?type=layout&sort=downloads" className="text-sm font-medium text-[var(--accent)] hover:underline">View all &rarr;</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {mostDownloaded.map((l) => <LayoutCard key={l.id} layout={l} />)}
            </div>
          </div>
        )}

        {!hasLayouts && (
          <div className="text-center py-16 bg-[var(--surface)] rounded-card border border-[var(--border)]">
            <p className="font-heading text-xl font-bold uppercase mb-1">No layouts published yet.</p>
            <p className="text-[var(--text-muted)] text-sm">Be the first to share your dashboard design!</p>
          </div>
        )}
      </div>

      {/* DBC FILES SECTION */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="font-heading text-3xl font-bold uppercase">DBC Files</h2>
          <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded">.dbc</span>
        </div>

        {/* Free DBCs */}
        {freeDbcs.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-xl font-bold uppercase">Free DBC Files</h3>
              <Link href="/browse?type=dbc&price=free" className="text-sm font-medium text-[var(--accent)] hover:underline">View all &rarr;</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {freeDbcs.map((l) => <LayoutCard key={l.id} layout={l} />)}
            </div>
          </div>
        )}

        {/* Popular DBCs */}
        {recentDbcs.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-xl font-bold uppercase">Popular DBC Files</h3>
              <Link href="/browse?type=dbc&sort=downloads" className="text-sm font-medium text-[var(--accent)] hover:underline">View all &rarr;</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {recentDbcs.map((l) => <LayoutCard key={l.id} layout={l} />)}
            </div>
          </div>
        )}

        {!hasDbcs && (
          <div className="text-center py-16 bg-[var(--surface)] rounded-card border border-[var(--border)]">
            <p className="font-heading text-xl font-bold uppercase mb-1">No DBC files published yet.</p>
            <p className="text-[var(--text-muted)] text-sm">Share your CAN database files with the community!</p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <section className="mb-20">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold text-[var(--accent)] tracking-[0.22em] uppercase mb-3">&mdash; Getting Started</p>
          <h2 className="font-heading text-4xl font-bold uppercase">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Browse",
              description: "Explore community-created dashboard layouts and DBC files. Filter by ECU type, rating, or price.",
            },
            {
              step: "02",
              title: "Download",
              description: "Download .rdm layout files or .dbc CAN database files directly to your computer with one click.",
            },
            {
              step: "03",
              title: "Install",
              description: "Import into the RDM-7 Visual Designer. Your new layout is ready to use on track instantly.",
            },
          ].map((item) => (
            <div key={item.step} className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-8 text-center hover:shadow-lg transition-shadow duration-300">
              <div className="font-heading text-5xl font-bold text-[var(--accent)] opacity-20 mb-4">{item.step}</div>
              <h3 className="font-heading text-xl font-bold uppercase mb-3">{item.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community CTA */}
      <section className="mb-8 bg-[var(--text)] rounded-card p-12 sm:p-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }} />
        <div className="relative z-10">
          <p className="text-[11px] font-bold text-[var(--accent)] tracking-[0.22em] uppercase mb-4">&mdash; Join the Community</p>
          <h2 className="font-heading text-4xl sm:text-5xl font-bold uppercase text-white mb-4">
            Share Your Creations
          </h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto mb-8 leading-relaxed">
            Built an amazing dashboard layout? Share it with the RDM-7 community and help fellow racers get the most out of their display.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-[var(--accent)] text-white font-heading font-bold text-sm uppercase tracking-wider px-10 py-4 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
          >
            Upload Your Layout &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
