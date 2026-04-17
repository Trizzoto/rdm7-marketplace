"use client";

/**
 * OpenInStudioButton — deep-links to RDM Studio with the layout pre-loaded.
 *
 * Two modes:
 *  - Full access (free / purchased): Opens Studio normally, user can edit and save.
 *  - Locked preview (paid, not purchased): Opens Studio in locked preview mode —
 *    simulation runs, all editing/saving/exporting is disabled, "Buy" overlay shown.
 */

type Props = {
  layoutId: string;
  rdmUrl: string | null;
  name: string;
  isAccessible: boolean;
  locked?: boolean;
};

const STUDIO_BASE = "https://studio.realtimedatamonitoring.com.au";

export function OpenInStudioButton({ layoutId, rdmUrl, name, isAccessible, locked }: Props) {
  if (!rdmUrl) return null;
  if (!locked && !isAccessible) return null;

  const params = new URLSearchParams({
    import: rdmUrl,
    importName: name,
    source: "marketplace",
    layoutId,
  });

  if (locked) {
    params.set("locked", "1");
    params.set("autoSim", "1");
  }

  const url = `${STUDIO_BASE}?${params.toString()}`;

  if (locked) {
    return (
      <div className="mt-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full text-center bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] font-heading font-bold py-3 rounded-lg hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors uppercase text-sm tracking-wide"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polygon points="6 4 20 12 6 20" />
          </svg>
          Preview in Studio
        </a>
      </div>
    );
  }

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
