export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-heading text-3xl font-black uppercase tracking-wide mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Last updated: March 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--text)]">
        {/* 1 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the RDM-7 Marketplace (&ldquo;Service&rdquo;), you agree to be bound
            by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to all the terms and
            conditions, you may not access or use the Service. We reserve the right to update these
            Terms at any time. Continued use after changes constitutes acceptance.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">2. User Accounts</h2>
          <p className="mb-3">
            To upload content or make purchases, you must create an account using Google
            authentication. You are responsible for maintaining the confidentiality of your account
            and for all activities that occur under your account.
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
            <li>You must provide accurate and complete information.</li>
            <li>You must be at least 18 years of age or the age of majority in your jurisdiction.</li>
            <li>You may not transfer your account to another person.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
          </ul>
        </section>

        {/* 3 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">3. Content &amp; Uploads</h2>
          <p className="mb-3">
            Users may upload dashboard layouts (.rdm files) and DBC files to the Marketplace. By
            uploading content, you represent that:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)] mb-3">
            <li>You own or have the right to distribute the content.</li>
            <li>The content does not infringe upon any third-party intellectual property rights.</li>
            <li>The content does not contain malicious code, viruses, or harmful material.</li>
            <li>The content is accurate in its description, including ECU compatibility claims.</li>
          </ul>
          <p>
            We reserve the right to remove any content that violates these Terms or is deemed
            inappropriate, without prior notice.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">4. Payments &amp; Fees</h2>
          <p className="mb-3">
            Creators may list items as free or set a price for their content. For paid listings:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)] mb-3">
            <li>
              The RDM-7 Marketplace charges a <strong className="text-[var(--text)]">15% platform fee</strong> on
              all paid transactions. Creators receive 85% of the listed sale price.
            </li>
            <li>Payments are processed through Stripe. By selling on the platform, you agree to Stripe&apos;s terms of service.</li>
            <li>Creators must connect a valid Stripe account to receive payouts.</li>
            <li>Prices are listed in USD. Currency conversions are handled by the payment processor.</li>
            <li>All sales are final. Refund requests are handled on a case-by-case basis.</li>
          </ul>
          <p>
            We reserve the right to modify the platform fee with 30 days&apos; advance notice to
            existing sellers.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">5. Intellectual Property</h2>
          <p className="mb-3">
            Creators retain all intellectual property rights to their uploaded content. By uploading
            content to the Marketplace, you grant RDM-7 a non-exclusive, worldwide, royalty-free
            license to display, distribute, and promote your content within the Service.
          </p>
          <p>
            The RDM-7 name, logo, and associated branding are trademarks of RDM-7. You may not use
            these marks without prior written permission, except as necessary to identify your
            content as compatible with RDM-7 products.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">6. Limitation of Liability</h2>
          <p className="mb-3">
            The Service is provided &ldquo;as is&rdquo; without warranties of any kind, either express or
            implied. RDM-7 does not guarantee:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)] mb-3">
            <li>The accuracy, completeness, or reliability of any content uploaded by users.</li>
            <li>That layouts or DBC files will be compatible with your specific hardware configuration.</li>
            <li>Uninterrupted or error-free operation of the Service.</li>
          </ul>
          <p>
            To the maximum extent permitted by applicable law, RDM-7 shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including loss of
            profits, data, or use, arising from your use of the Service or any content obtained
            through the Service.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">7. Changes to Terms</h2>
          <p>
            We may revise these Terms at any time by posting the updated version on this page. The
            &ldquo;Last updated&rdquo; date at the top indicates when the Terms were last revised.
            Material changes will be communicated via email or a prominent notice on the Service.
            Your continued use of the Service after any changes constitutes acceptance of the
            revised Terms.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6">
          <h2 className="font-heading text-xl font-bold uppercase mb-3">Contact</h2>
          <p>
            If you have questions about these Terms of Service, please contact us at{" "}
            <a
              href="https://www.rdm7.com.au/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              rdm7.com.au/contact
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
