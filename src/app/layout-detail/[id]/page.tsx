import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Layout } from "@/lib/supabase";
import { BuyButton } from "@/components/BuyButton";
import { RatingSection } from "@/components/RatingSection";
import Link from "next/link";

export const revalidate = 30;

async function getLayout(id: string): Promise<Layout | null> {
  const { data } = await supabase
    .from("layouts")
    .select("*, profiles(display_name, avatar_url)")
    .eq("id", id)
    .single();
  return data as Layout | null;
}

async function getRelatedLayouts(layout: Layout): Promise<Layout[]> {
  const { data } = await supabase
    .from("layouts")
    .select("*, profiles(display_name, avatar_url)")
    .eq("is_published", true)
    .eq("item_type", layout.item_type)
    .neq("id", layout.id)
    .order("downloads", { ascending: false })
    .limit(4);
  return (data as Layout[]) || [];
}

export default async function LayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const layout = await getLayout(id);
  if (!layout) notFound();

  const relatedLayouts = await getRelatedLayouts(layout);
  const sizeMB = (layout.file_size_bytes / 1048576).toFixed(1);
  const isDbc = layout.item_type === "dbc";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
        <Link href="/" className="hover:text-[var(--accent)] transition-colors">Home</Link>
        <span>/</span>
        <Link href={`/browse?type=${layout.item_type}`} className="hover:text-[var(--accent)] transition-colors">
          {isDbc ? "DBC Files" : "Layouts"}
        </Link>
        <span>/</span>
        <span className="text-[var(--text)]">{layout.name}</span>
      </nav>

      {/* Screenshot */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card overflow-hidden mb-8 shadow-sm">
        {layout.screenshot_url ? (
          <img src={layout.screenshot_url} alt={layout.name} className="w-full" />
        ) : (
          <div className="aspect-[5/3] flex items-center justify-center text-[var(--text-muted)] bg-[#0a0a0c]">
            <span className="font-heading text-2xl font-bold uppercase text-gray-600">
              {isDbc ? ".dbc" : "No Preview"}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isDbc ? "bg-blue-500 text-white" : "bg-gray-700 text-white"}`}>
              {isDbc ? "DBC" : "LAYOUT"}
            </span>
            {layout.ecu_type && (
              <span className="text-xs font-medium bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded text-[var(--text-muted)]">{layout.ecu_type}</span>
            )}
          </div>

          <h1 className="font-heading text-4xl font-bold uppercase mb-3 leading-tight">{layout.name}</h1>

          <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mb-6">
            <Link href={`/profile/${layout.author_id}`} className="hover:text-[var(--accent)] transition-colors font-medium">
              by {layout.profiles?.display_name || "Unknown"}
            </Link>
            {layout.rating > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-[var(--accent)]">&#9733;</span>
                {layout.rating.toFixed(1)} ({layout.rating_count} reviews)
              </span>
            )}
            <span>{layout.downloads} downloads</span>
          </div>

          {layout.description && (
            <div className="mb-8">
              <h3 className="font-heading text-lg font-bold uppercase mb-3">Description</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{layout.description}</p>
            </div>
          )}

          {layout.tags && layout.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {layout.tags.map((tag) => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ratings */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6">
            <h3 className="font-heading text-lg font-bold uppercase mb-4">Reviews</h3>
            <RatingSection layoutId={layout.id} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Download Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 shadow-sm sticky top-24">
            <div className="text-3xl font-heading font-bold text-[var(--accent)] mb-4">
              {layout.price === 0 ? "Free" : `$${layout.price.toFixed(2)}`}
            </div>
            <BuyButton layoutId={layout.id} rdmUrl={layout.rdm_url} name={layout.name} price={layout.price} itemType={layout.item_type} />

            <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-3 text-sm text-[var(--text-muted)]">
              <div className="flex justify-between">
                <span>Downloads</span>
                <span className="font-medium text-[var(--text)]">{layout.downloads}</span>
              </div>
              {!isDbc && (
                <div className="flex justify-between">
                  <span>Widgets</span>
                  <span className="font-medium text-[var(--text)]">{layout.widget_count}</span>
                </div>
              )}
              {!isDbc && (
                <div className="flex justify-between">
                  <span>Signals</span>
                  <span className="font-medium text-[var(--text)]">{layout.signal_count}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>File Size</span>
                <span className="font-medium text-[var(--text)]">{sizeMB} MB</span>
              </div>
              <div className="flex justify-between">
                <span>Schema</span>
                <span className="font-medium text-[var(--text)]">v{layout.schema_version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Layouts */}
      {relatedLayouts.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold uppercase">
              Related {isDbc ? "DBC Files" : "Layouts"}
            </h2>
            <Link href={`/browse?type=${layout.item_type}`} className="text-sm font-medium text-[var(--accent)] hover:underline">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedLayouts.map((l) => (
              <Link key={l.id} href={`/layout-detail/${l.id}`} className="block group">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card overflow-hidden transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]">
                  <div className={`${l.item_type === "dbc" ? "aspect-[3/1]" : "aspect-[5/3]"} bg-[#0a0a0c] relative overflow-hidden`}>
                    {l.item_type !== "dbc" && l.screenshot_url ? (
                      <img src={l.screenshot_url} alt={l.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-heading text-2xl font-bold text-gray-600 uppercase">
                          {l.item_type === "dbc" ? ".dbc" : "No Preview"}
                        </span>
                      </div>
                    )}
                    {l.price === 0 ? (
                      <span className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">FREE</span>
                    ) : (
                      <span className="absolute top-2 right-2 bg-[var(--accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded">${l.price.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading text-sm font-bold uppercase text-[var(--text)] truncate">{l.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">by {l.profiles?.display_name || "Unknown"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
