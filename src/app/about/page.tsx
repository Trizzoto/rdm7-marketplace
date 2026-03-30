import type { Metadata } from "next";
import Link from "next/link";
import { HowItWorks } from "@/components/HowItWorks";
import { CommunityCTA } from "@/components/CommunityCTA";

export const metadata: Metadata = {
  title: "About | RDM-7 Marketplace",
  description: "Learn about the RDM-7 Marketplace — how it works, how to publish layouts, and community guidelines.",
};

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="text-center py-20">
        <p className="text-[var(--accent)] font-semibold text-sm tracking-widest uppercase mb-4">
          &mdash; About
        </p>
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight mb-4">
          About the<br />
          <span className="text-[var(--accent)]">Marketplace</span>
        </h1>
        <p className="text-[var(--text-muted)] text-lg max-w-lg mx-auto">
          A community-driven hub for sharing dashboard layouts and CAN database files for the RDM-7 display.
        </p>
      </section>

      {/* What is RDM-7? */}
      <section className="mb-16">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 sm:p-12">
          <p className="text-[var(--accent)] font-semibold text-xs tracking-widest uppercase mb-3">
            &mdash; The Product
          </p>
          <h2 className="text-3xl font-black font-heading tracking-tight mb-4">
            What is RDM-7?
          </h2>
          <div className="max-w-3xl text-[var(--text-muted)] leading-relaxed space-y-4">
            <p>
              The RDM-7 is a high-performance CAN bus dashboard display designed for motorsport, 4WD,
              and performance vehicles. It connects directly to your vehicle&apos;s CAN bus network and
              displays real-time data through fully customisable dashboard layouts.
            </p>
            <p>
              Using the RDM-7 Visual Designer desktop application, you can create stunning gauges,
              data displays, warning indicators, and more &mdash; all tailored to your exact vehicle and preferences.
              The designer exports <code className="text-[var(--text)] bg-[var(--bg)] px-1.5 py-0.5 rounded text-sm font-mono">.rdm</code> layout
              files that load directly onto your display.
            </p>
            <p>
              <Link
                href="https://www.rdm7.com.au"
                target="_blank"
                className="text-[var(--accent)] font-semibold hover:underline"
              >
                Visit rdm7.com.au &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* How the Marketplace Works */}
      <section className="mb-16">
        <div className="text-center mb-10">
          <p className="text-[var(--accent)] font-semibold text-xs tracking-widest uppercase mb-3">
            &mdash; Getting Started
          </p>
          <h2 className="text-3xl font-black font-heading tracking-tight">
            How the Marketplace Works
          </h2>
        </div>
        <HowItWorks />
      </section>

      {/* For Creators */}
      <section className="mb-16">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 sm:p-12">
          <p className="text-[var(--accent)] font-semibold text-xs tracking-widest uppercase mb-3">
            &mdash; For Creators
          </p>
          <h2 className="text-3xl font-black font-heading tracking-tight mb-4">
            Publish &amp; Earn
          </h2>
          <div className="max-w-3xl text-[var(--text-muted)] leading-relaxed space-y-4">
            <p>
              Designed an incredible dashboard layout? Share it with the community. The RDM-7 Marketplace
              lets creators publish their <code className="text-[var(--text)] bg-[var(--bg)] px-1.5 py-0.5 rounded text-sm font-mono">.rdm</code> layouts
              and <code className="text-[var(--text)] bg-[var(--bg)] px-1.5 py-0.5 rounded text-sm font-mono">.dbc</code> CAN
              database files for others to use.
            </p>
            <p>
              Getting started is simple:
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-1">
              <li>Sign in with your Google account</li>
              <li>Go to your Dashboard and upload your file</li>
              <li>Add a title, description, screenshots, and set your price (or make it free)</li>
              <li>Publish and share with the RDM-7 community</li>
            </ol>
            <p>
              Premium listings let you set a price for your work. You earn directly from every sale
              while helping fellow enthusiasts get the most out of their RDM-7 displays.
            </p>
          </div>
        </div>
      </section>

      {/* Community Guidelines */}
      <section className="mb-16">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 sm:p-12">
          <p className="text-[var(--accent)] font-semibold text-xs tracking-widest uppercase mb-3">
            &mdash; Community
          </p>
          <h2 className="text-3xl font-black font-heading tracking-tight mb-4">
            Community Guidelines
          </h2>
          <div className="max-w-3xl text-[var(--text-muted)] leading-relaxed space-y-4">
            <p>
              The marketplace is built on trust and respect. All users are expected to follow these guidelines:
            </p>
            <ul className="space-y-3">
              {[
                { title: "Original Work", desc: "Only publish layouts and files you have created yourself or have permission to distribute." },
                { title: "Accurate Descriptions", desc: "Provide honest and detailed descriptions, including compatible vehicles and CAN protocols." },
                { title: "Quality Standards", desc: "Ensure your layouts are functional and well-tested before publishing." },
                { title: "Respectful Reviews", desc: "Leave constructive feedback. Ratings should reflect genuine experience with the file." },
                { title: "No Malicious Content", desc: "Do not upload files that could damage hardware or contain misleading signal configurations." },
                { title: "Fair Pricing", desc: "If you set a price, make sure it reflects the value and effort of your work." },
              ].map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <span className="font-semibold text-[var(--text)]">{item.title}</span>
                    <span className="text-[var(--text-muted)]"> &mdash; {item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mb-8">
        <CommunityCTA />
      </section>
    </div>
  );
}
