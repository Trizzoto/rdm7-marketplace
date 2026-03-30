"use client";

import Link from "next/link";
import type { Layout } from "@/lib/supabase";

export function LayoutCard({ layout }: { layout: Layout }) {
  const authorName = layout.profiles?.display_name || "Unknown";
  const isDbc = layout.item_type === "dbc";

  return (
    <Link href={`/layout-detail/${layout.id}`} className="block group">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card overflow-hidden transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]">
        {/* Screenshot / DBC placeholder */}
        <div className={`${isDbc ? "aspect-[3/1]" : "aspect-[5/3]"} bg-[#0a0a0c] relative overflow-hidden`}>
          {!isDbc && layout.screenshot_url ? (
            <img
              src={layout.screenshot_url}
              alt={layout.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          ) : isDbc ? (
            <div className="w-full h-full flex items-center justify-center gap-3">
              <span className="font-heading text-3xl font-bold text-gray-600 uppercase">.dbc</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
              No Preview
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isDbc ? "bg-blue-500 text-white" : "bg-gray-700 text-white"}`}>
              {isDbc ? "DBC" : "LAYOUT"}
            </span>
          </div>
          {layout.price === 0 ? (
            <span className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              FREE
            </span>
          ) : (
            <span className="absolute top-2 right-2 bg-[var(--accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded">
              ${layout.price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-heading text-sm font-bold uppercase text-[var(--text)] truncate">{layout.name}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">by {authorName}</p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              {layout.ecu_type && <span className="bg-[var(--bg)] px-1.5 py-0.5 rounded font-medium">{layout.ecu_type}</span>}
              {!isDbc && <span>{layout.widget_count}w</span>}
              <span>{layout.downloads} DL</span>
            </div>
            {layout.rating > 0 && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-[var(--accent)]">&#9733;</span>
                <span className="text-[var(--text-muted)]">{layout.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
