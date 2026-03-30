export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-heading text-3xl font-black uppercase tracking-wide mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Last updated: March 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--text)]">
        {/* 1 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">1. Data Collection</h2>
          <p className="mb-3">
            We collect the following information when you use the RDM-7 Marketplace:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
            <li>
              <strong className="text-[var(--text)]">Account information:</strong> name, email
              address, and profile picture provided through Google authentication.
            </li>
            <li>
              <strong className="text-[var(--text)]">Profile data:</strong> display name, bio, and
              avatar that you choose to provide.
            </li>
            <li>
              <strong className="text-[var(--text)]">Upload data:</strong> layout files, DBC files,
              screenshots, descriptions, and metadata you submit.
            </li>
            <li>
              <strong className="text-[var(--text)]">Usage data:</strong> download counts, ratings,
              and interaction patterns with the Service.
            </li>
            <li>
              <strong className="text-[var(--text)]">Technical data:</strong> browser type, IP
              address, and device information collected automatically.
            </li>
          </ul>
        </section>

        {/* 2 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">2. How We Use Your Data</h2>
          <p className="mb-3">We use collected information to:</p>
          <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
            <li>Provide, maintain, and improve the Marketplace service.</li>
            <li>Process transactions and send related communications.</li>
            <li>Display your public profile and uploaded content to other users.</li>
            <li>Send notifications about downloads, ratings, and payments.</li>
            <li>Detect and prevent fraud, abuse, or security issues.</li>
            <li>Analyze usage patterns to improve user experience.</li>
          </ul>
        </section>

        {/* 3 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">3. Cookies &amp; Local Storage</h2>
          <p className="mb-3">
            The RDM-7 Marketplace uses cookies and local storage for:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
            <li>
              <strong className="text-[var(--text)]">Authentication:</strong> maintaining your
              logged-in session via Supabase auth tokens.
            </li>
            <li>
              <strong className="text-[var(--text)]">Preferences:</strong> storing user preferences
              such as recent searches and display settings.
            </li>
            <li>
              <strong className="text-[var(--text)]">Analytics:</strong> understanding how users
              interact with the Service to improve functionality.
            </li>
          </ul>
          <p className="mt-3">
            You can manage cookie preferences through your browser settings. Disabling cookies may
            affect the functionality of the Service.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">4. Third-Party Services</h2>
          <p className="mb-3">
            We use the following third-party services to operate the Marketplace:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
            <li>
              <strong className="text-[var(--text)]">Supabase:</strong> provides authentication,
              database, and file storage services. Your data is stored securely in Supabase&apos;s
              infrastructure. See{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Supabase&apos;s Privacy Policy
              </a>.
            </li>
            <li>
              <strong className="text-[var(--text)]">Stripe:</strong> handles payment processing for
              paid listings. When you make a purchase or connect a seller account, your payment
              information is handled directly by Stripe. We do not store credit card numbers. See{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Stripe&apos;s Privacy Policy
              </a>.
            </li>
            <li>
              <strong className="text-[var(--text)]">Google:</strong> provides OAuth authentication.
              We only access your basic profile information (name, email, avatar). See{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Google&apos;s Privacy Policy
              </a>.
            </li>
            <li>
              <strong className="text-[var(--text)]">Vercel:</strong> hosts the web application and
              may process request logs. See{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Vercel&apos;s Privacy Policy
              </a>.
            </li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">5. Your Rights</h2>
          <p className="mb-3">
            Depending on your jurisdiction, you may have the following rights regarding your personal
            data:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
            <li>
              <strong className="text-[var(--text)]">Access:</strong> request a copy of the personal
              data we hold about you.
            </li>
            <li>
              <strong className="text-[var(--text)]">Correction:</strong> request correction of
              inaccurate personal data.
            </li>
            <li>
              <strong className="text-[var(--text)]">Deletion:</strong> request deletion of your
              personal data, subject to legal retention requirements.
            </li>
            <li>
              <strong className="text-[var(--text)]">Portability:</strong> request your data in a
              portable, machine-readable format.
            </li>
            <li>
              <strong className="text-[var(--text)]">Objection:</strong> object to certain types of
              data processing.
            </li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, please contact us using the information below.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">6. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data, including
            encrypted connections (HTTPS/TLS), secure authentication tokens, and access controls.
            However, no method of electronic transmission or storage is 100% secure, and we cannot
            guarantee absolute security.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="font-heading text-xl font-bold uppercase mb-3">7. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to
            provide the Service. If you delete your account, we will remove your personal data
            within 30 days, except where retention is required by law or for legitimate business
            purposes (such as transaction records).
          </p>
        </section>

        {/* Contact */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6">
          <h2 className="font-heading text-xl font-bold uppercase mb-3">Contact</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise your data rights,
            please contact us at{" "}
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
