import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | RDM-7 Marketplace",
  description: "See what's new on the RDM-7 Marketplace. Platform updates, new features, and improvements.",
};

type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  changes: { type: "added" | "improved" | "fixed"; text: string }[];
};

const changelog: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "2026-03-28",
    title: "Collections & Discovery",
    changes: [
      { type: "added", text: "Favorites system - save layouts to your personal collection" },
      { type: "added", text: "Trending page showing the most popular layouts" },
      { type: "added", text: "New Arrivals page for freshly published content" },
      { type: "added", text: "Quick preview modal for layouts without leaving the browse page" },
      { type: "added", text: "Platform changelog page" },
      { type: "improved", text: "Navigation updated with Trending and New links" },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-03-15",
    title: "Community & Ratings",
    changes: [
      { type: "added", text: "Star rating system for layouts and DBC files" },
      { type: "added", text: "Creator profiles with bio and avatar" },
      { type: "added", text: "Notification system for downloads and ratings" },
      { type: "improved", text: "Search now supports filtering by ECU type" },
      { type: "fixed", text: "Download counter now updates in real time" },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-02-28",
    title: "DBC File Support",
    changes: [
      { type: "added", text: "DBC file uploads and marketplace listings" },
      { type: "added", text: "Browse page with type toggle for Layouts vs DBC files" },
      { type: "added", text: "Price filtering - free and premium content" },
      { type: "improved", text: "Layout cards now show widget count and ECU type" },
      { type: "fixed", text: "File size display now correctly handles large files" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-02-01",
    title: "Initial Launch",
    changes: [
      { type: "added", text: "RDM-7 Marketplace launched with layout sharing" },
      { type: "added", text: "Google sign-in authentication" },
      { type: "added", text: "Layout upload with screenshot preview" },
      { type: "added", text: "Download tracking and creator dashboards" },
      { type: "added", text: "Browse and search functionality" },
    ],
  },
];

const typeBadge: Record<string, { label: string; className: string }> = {
  added: { label: "Added", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  improved: { label: "Improved", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  fixed: { label: "Fixed", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-black uppercase tracking-wide">
          Changelog
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Platform updates, new features, and improvements to the RDM-7 Marketplace.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[var(--border)]" />

        <div className="space-y-12">
          {changelog.map((entry) => (
            <div key={entry.version} className="relative pl-8">
              {/* Timeline dot */}
              <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-[3px] border-[#CC0000] bg-[var(--bg)]" />

              {/* Version header */}
              <div className="flex flex-wrap items-baseline gap-3 mb-3">
                <span className="font-heading text-xs font-bold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)] px-2.5 py-1 rounded">
                  v{entry.version}
                </span>
                <time className="text-xs text-[var(--text-muted)]">
                  {new Date(entry.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>

              <h2 className="font-heading text-lg font-bold uppercase mb-4 text-[var(--text)]">
                {entry.title}
              </h2>

              {/* Changes list */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-5 space-y-3">
                {entry.changes.map((change, i) => {
                  const badge = typeBadge[change.type];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 mt-0.5 ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">{change.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
