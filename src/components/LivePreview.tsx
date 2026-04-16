"use client";

/**
 * LivePreview — live-animated preview for .rdm layouts via Studio iframe.
 *
 * Clicks "Live Preview" → opens a modal with Studio embedded in preview-only mode.
 * Studio loads the layout from the query param and runs simulation automatically,
 * so the viewer sees the layout with real-looking signal values instead of a
 * static screenshot. Press Esc or tap outside to close.
 *
 * v1 trade-off: this is an iframe into the live Studio — it requires the user
 * to have an internet connection and the Studio CORS to allow it, but reuses
 * 100% of existing rendering infrastructure with zero duplication.
 */

import { useEffect, useState } from "react";

type Props = {
  rdmUrl: string | null;
  name: string;
};

const STUDIO_BASE = "https://studio.realtimedatamonitoring.com.au";

export function LivePreview({ rdmUrl, name }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Prevent background scroll while modal is open
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!rdmUrl) return null;

  const iframeSrc = `${STUDIO_BASE}?${new URLSearchParams({
    import: rdmUrl,
    importName: name,
    source: "marketplace-preview",
    mode: "preview",
    autoSim: "1",
  }).toString()}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm font-medium px-4 py-2 rounded-lg hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        title="Open an interactive live preview with simulated data"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="6 4 20 12 6 20" />
        </svg>
        Live Preview
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Live preview of ${name}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-card shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="font-heading text-sm font-bold uppercase truncate pr-3">
                Live Preview — {name}
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="relative flex-1 min-h-0 bg-[#0a0a0c]">
              <iframe
                src={iframeSrc}
                title={`Live preview of ${name}`}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay"
              />
            </div>
            <div className="px-4 py-2 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] bg-[var(--bg)]">
              Preview running in RDM Studio with simulated signal values. Close with Esc.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
