"use client";

/**
 * OpenInStudioButton — deep-links to RDM Studio with the layout pre-loaded.
 *
 * Opens https://studio.realtimedatamonitoring.com.au?import=<rdm_url>
 * Studio's receiver fetches the .rdm, imports it through the normal pipeline,
 * and the user lands in the editor with the layout ready. Only shown for
 * layouts the current user has access to (free items or purchased).
 */

type Props = {
  layoutId: string;
  rdmUrl: string | null;
  name: string;
  isAccessible: boolean;
};

const STUDIO_BASE = "https://studio.realtimedatamonitoring.com.au";

export function OpenInStudioButton({ layoutId, rdmUrl, name, isAccessible }: Props) {
  if (!rdmUrl || !isAccessible) return null;

  const params = new URLSearchParams({
    import: rdmUrl,
    importName: name,
    source: "marketplace",
    layoutId,
  });
  const url = `${STUDIO_BASE}?${params.toString()}`;

  return (
    <div className="mt-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-heading font-bold py-3 rounded-lg hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors uppercase text-sm tracking-wide"
      >
        Open in Studio
      </a>
    </div>
  );
}
