"use client";

/**
 * OpenInStudioButton — primary integration between Marketplace and RDM Studio.
 *
 * Two flows:
 *  • "Open in Studio" — deep-links to https://studio.realtimedatamonitoring.com.au?import=<rdm_url>
 *    Studio's receiver fetches the .rdm, imports it through the normal pipeline, and the user
 *    lands in the editor with the layout pre-loaded. Free layouts: any user. Paid layouts:
 *    only shown on layouts the current user has purchased (or free items).
 *
 *  • "Push to my Dash" — same import path, but with a flag hint that Studio should auto-apply
 *    the layout to the connected dash immediately. Studio's behaviour: if a dash is connected
 *    (USB via desktop, Wi-Fi push via desktop), push directly; otherwise fall back to
 *    standard import. The button labels are intentionally honest about what'll happen.
 */

import { useState } from "react";

type Props = {
  layoutId: string;
  rdmUrl: string | null;
  name: string;
  isAccessible: boolean; // free or user has purchased
};

const STUDIO_BASE = "https://studio.realtimedatamonitoring.com.au";

export function OpenInStudioButton({ layoutId, rdmUrl, name, isAccessible }: Props) {
  const [pushing, setPushing] = useState(false);

  if (!rdmUrl || !isAccessible) return null;

  const openParams = new URLSearchParams({
    import: rdmUrl,
    importName: name,
    source: "marketplace",
    layoutId,
  });
  const openUrl = `${STUDIO_BASE}?${openParams.toString()}`;

  const pushParams = new URLSearchParams({
    import: rdmUrl,
    importName: name,
    source: "marketplace",
    layoutId,
    pushToDash: "1",
  });
  const pushUrl = `${STUDIO_BASE}?${pushParams.toString()}`;

  const handlePush = () => {
    setPushing(true);
    // Small delay so the spinner is visible before navigation
    setTimeout(() => {
      window.open(pushUrl, "_blank", "noopener,noreferrer");
      setPushing(false);
    }, 120);
  };

  return (
    <div className="mt-3 space-y-2">
      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-heading font-bold py-3 rounded-lg hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors uppercase text-sm tracking-wide"
      >
        Open in Studio
      </a>

      <button
        onClick={handlePush}
        disabled={pushing}
        className="block w-full text-center bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] font-medium py-2 rounded-lg hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-xs tracking-wide disabled:opacity-60"
        title="Opens RDM Studio with a hint to push this layout directly to your connected dash (requires the desktop app + a dash connection)"
      >
        {pushing ? "Opening…" : "Push to my Dash →"}
      </button>
    </div>
  );
}
