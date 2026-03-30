import Link from "next/link";

export function CommunityCTA() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-[var(--accent-light)] border border-red-100 py-16 px-8 text-center">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--accent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto">
        <p className="text-[var(--accent)] font-semibold text-sm tracking-widest uppercase mb-4">
          &mdash; For Creators
        </p>
        <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight mb-4">
          Ready to share your designs?
        </h2>
        <p className="text-[var(--text-muted)] text-base leading-relaxed mb-8 max-w-lg mx-auto">
          Publish your custom dashboard layouts and DBC files to the marketplace. Share with the community for free or set a price for your premium work.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-[var(--accent)] text-white font-bold text-sm uppercase tracking-wider px-8 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
        >
          Start Publishing &rarr;
        </Link>
      </div>
    </section>
  );
}
