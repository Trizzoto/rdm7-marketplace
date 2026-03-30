"use client";

import { useEffect, useCallback } from "react";
import type { Layout } from "@/lib/supabase";
import { FavoriteButton } from "./FavoriteButton";
import { DownloadButton } from "./DownloadButton";
import Link from "next/link";

export function LayoutPreviewModal({
  layout,
  onClose,
}: {
  layout: Layout;
  onClose: () => void;
}) {
  const isDbc = layout.item_type === "dbc";
  const authorName = layout.profiles?.display_name || "Unknown";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-card max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close preview"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Screenshot */}
        <div className={`${isDbc ? "aspect-[3/1]" : "aspect-[16/9]"} bg-[#0a0a0c] relative`}>
          {!isDbc && layout.screenshot_url ? (
            <img
              src={layout.screenshot_url}
              alt={layout.name}
              className="w-full h-full object-contain"
            />
          ) : isDbc ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-heading text-5xl font-bold text-gray-600 uppercase">.dbc</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              No Preview Available
            </div>
          )}

          {/* Favorite button overlay */}
          <div className="absolute top-3 left-3">
            <FavoriteButton layoutId={layout.id} size="md" />
          </div>

          {/* Price badge */}
          {layout.price === 0 ? (
            <span className="absolute top-3 right-14 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded">
              FREE
            </span>
          ) : (
            <span className="absolute top-3 right-14 bg-[var(--accent)] text-white text-xs font-bold px-3 py-1 rounded">
              ${layout.price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-heading text-xl font-bold uppercase text-[var(--text)] truncate">
                {layout.name}
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">by {authorName}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] shrink-0">
              {layout.ecu_type && (
                <span className="bg-[var(--bg)] px-2 py-1 rounded font-medium">
                  {layout.ecu_type}
                </span>
              )}
              {!isDbc && <span>{layout.widget_count} widgets</span>}
              <span>{layout.downloads} downloads</span>
              {layout.rating > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-[var(--accent)]">&#9733;</span>
                  {layout.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {layout.description && (
            <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">
              {layout.description}
            </p>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <DownloadButton
                layoutId={layout.id}
                rdmUrl={layout.rdm_url}
                name={layout.name}
                itemType={layout.item_type}
              />
            </div>
            <Link
              href={`/layout-detail/${layout.id}`}
              className="px-5 py-2.5 border border-[var(--border)] rounded-lg text-sm font-bold uppercase tracking-wide text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
