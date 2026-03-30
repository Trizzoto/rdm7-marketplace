"use client";

import { useState } from "react";

const faqItems = [
  {
    question: "What is an .rdm file?",
    answer:
      "An .rdm file is a dashboard layout file created with the RDM-7 Visual Designer desktop application. It contains all the gauge configurations, positioning, styling, and signal mappings for a custom dashboard display. You can load .rdm files directly onto your RDM-7 device.",
  },
  {
    question: "How do I install a layout?",
    answer:
      "Download the .rdm file from the marketplace, then open it in the RDM-7 Visual Designer application. From there, you can preview the layout, make any adjustments, and transfer it to your RDM-7 display via USB. The entire process takes just a few clicks.",
  },
  {
    question: "Can I sell my layouts?",
    answer:
      "Yes! When publishing a layout or DBC file, you can set a price for your work. Sign in to your account, go to your Dashboard, and upload your file with a price tag. Free listings are also welcome and help grow the community.",
  },
  {
    question: "What is a DBC file?",
    answer:
      "A DBC (Database CAN) file defines the signals and messages on a vehicle's CAN bus network. It tells the RDM-7 how to decode raw CAN data into meaningful values like RPM, coolant temperature, oil pressure, and more. Each vehicle or ECU may have a different DBC file.",
  },
  {
    question: "How do I create a DBC file?",
    answer:
      "DBC files can be created using the RDM-7 Visual Designer's built-in signal editor or specialist CAN tools. You define each CAN message ID, its signals, bit positions, scaling factors, and units. Many vehicle communities also share DBC files for common platforms.",
  },
  {
    question: "Is it free to browse?",
    answer:
      "Absolutely. Browsing the marketplace is completely free. You can view all listings, screenshots, descriptions, and ratings without an account. You only need to sign in when you want to download files, leave reviews, or publish your own content.",
  },
  {
    question: "How do ratings work?",
    answer:
      "After downloading a layout or DBC file, you can leave a star rating (1 to 5) and an optional review. Ratings help the community identify high-quality content. Only verified downloads can leave ratings to ensure honest feedback.",
  },
];

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: (typeof faqItems)[0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-[var(--bg)] transition-colors"
      >
        <span className="font-bold text-[var(--text)] font-heading text-lg">
          {item.question}
        </span>
        <svg
          className={`w-5 h-5 text-[var(--accent)] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-200 ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-5 text-[var(--text-muted)] text-sm leading-relaxed border-t border-[var(--border)] pt-4">
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div>
      {/* Hero */}
      <section className="text-center py-20">
        <p className="text-[var(--accent)] font-semibold text-sm tracking-widest uppercase mb-4">
          &mdash; Help Centre
        </p>
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight mb-4">
          Frequently Asked<br />
          <span className="text-[var(--accent)]">Questions</span>
        </h1>
        <p className="text-[var(--text-muted)] text-lg max-w-md mx-auto">
          Everything you need to know about the RDM-7 Marketplace.
        </p>
      </section>

      {/* Accordion */}
      <section className="max-w-3xl mx-auto mb-16">
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <AccordionItem
              key={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </section>

      {/* Still have questions? */}
      <section className="text-center py-12 mb-8">
        <h2 className="text-2xl font-black font-heading mb-3">Still have questions?</h2>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          Get in touch with the RDM-7 team and we&apos;ll help you out.
        </p>
        <a
          href="https://www.rdm7.com.au/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[var(--accent)] text-white font-bold text-sm uppercase tracking-wider px-8 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors"
        >
          Contact Support &rarr;
        </a>
      </section>
    </div>
  );
}
