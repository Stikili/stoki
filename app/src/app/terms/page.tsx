import type { Metadata } from 'next'

/**
 * Terms of Service. Linked from the landing footer and the login footer.
 *
 * Aligned with South African e-commerce / consumer-protection norms (ECT
 * Act 25 of 2002, CPA where applicable) and references the POPIA-compliant
 * Privacy Notice for personal-information handling.
 *
 * Note for the operator: replace contact + governing-law specifics with the
 * registered business name and chosen forum before going to production.
 */

const SITE = 'https://stokiapp.com'
const PAGE_URL = `${SITE}/terms`

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    "Stoki's terms of service: what you get, what you owe, and the legal basics of using the app. Aligned with the SA ECT Act and CPA.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'Stoki Terms of Service',
    description: 'Terms of service — what you get, what you owe, and the legal basics.',
    images: [{ url: '/og-image.png', width: 1200, height: 627 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stoki Terms of Service',
    description: 'Terms of service.',
    images: ['/og-image.png'],
  },
}

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12" style={{ color: 'var(--foreground)' }}>
      <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Last updated: May 2026
      </p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
        <section>
          <h2 className="font-bold text-lg mb-2">1. About these terms</h2>
          <p>
            These terms govern your use of Stoki (&quot;the service&quot;). By creating an account or using
            the app you agree to these terms. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">2. The service</h2>
          <p>
            Stoki is a software service for South African SMME retail. It provides
            point-of-sale, stock control, credit-book, B2B invoicing, reports, and an
            AI advisor. The service is delivered as-is and we make no guarantee that it will
            meet every business&apos;s exact needs. Features may change or be added over time.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">3. Your account</h2>
          <p>You are responsible for:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>The accuracy of information you enter (products, prices, sales, customer records).</li>
            <li>Keeping your sign-in credentials secure. You must not share your account.</li>
            <li>Activity that happens under your account, including by team members you invite.</li>
            <li>Complying with applicable South African law in how you use the service — including SARS, POPIA, and the Consumer Protection Act.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">4. Free tier &amp; paid tiers</h2>
          <p>
            Stoki offers a free tier covering one shop with full feature access. Additional shops
            and team seats may require a paid subscription, the price and terms of which are shown
            at the point of upgrade. We may change pricing with at least 30 days&apos; advance notice
            for active subscribers.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc ml-5 space-y-1 mt-2">
            <li>Use the service for unlawful business activity.</li>
            <li>Attempt to bypass authentication, RLS isolation, or rate-limits.</li>
            <li>Send spam or unsolicited messages to debtors, customers, or third parties.</li>
            <li>Reverse-engineer, scrape, or resell the service.</li>
            <li>Upload malware, illegal content, or content that infringes third-party rights.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">6. Your data, your ownership</h2>
          <p>
            You own the business data you put into Stoki — products, sales, customers, debtors,
            invoices, etc. You can export it at any time from <em>Settings → Account</em>. We
            process it on your behalf to deliver the service, in accordance with our{' '}
            <a href="/privacy" className="text-brand underline">Privacy Notice</a>.
          </p>
          <p className="mt-2">
            If you delete your account, your data is removed within 30 days, except where law
            requires longer retention (e.g. SARS-mandated invoice retention).
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">7. AI advisor</h2>
          <p>
            The Stoki AI advisor produces guidance based on your store data and South African
            economic context. Its responses are <strong>informational only</strong> and are not
            financial, tax, or legal advice. You are responsible for verifying suggestions before
            acting on them.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">8. Tax invoices &amp; SARS</h2>
          <p>
            Stoki helps generate tax invoices in line with SARS requirements when you mark your
            store as VAT-registered. You remain responsible for the accuracy of your VAT number,
            the calculation and remittance of VAT, and your SARS submissions.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">9. Availability &amp; service interruptions</h2>
          <p>
            We aim for high availability but do not guarantee uninterrupted service. Stoki works
            offline for sales recording (queued locally and synced when you reconnect) so a
            short network or service outage does not stop you from trading.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">10. Intellectual property</h2>
          <p>
            Stoki, the Stoki name, logo, and software are owned by us. Use of the service does
            not transfer any of those rights to you. You may not use Stoki branding to imply
            endorsement without written permission.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">11. Termination</h2>
          <p>
            You may delete your account at any time from <em>Settings → Account</em>. We may
            suspend or terminate accounts that materially breach these terms, with reasonable
            notice where the law permits. On termination your data is handled per the Privacy Notice.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">12. Liability</h2>
          <p>
            To the maximum extent permitted by South African law, Stoki and its operators are
            not liable for indirect, incidental, or consequential losses arising from your use of
            the service — including lost profits, lost data, or business interruption. Where
            liability cannot be excluded, our total liability for any claim is limited to the
            amount you paid us in the 12 months preceding the claim (or zero on the free tier).
          </p>
          <p className="mt-2">
            Nothing in these terms limits any right you have under the Consumer Protection Act
            65 of 2008 or other non-excludable South African law.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">13. Changes to these terms</h2>
          <p>
            We may update these terms as the service evolves. Material changes will be flagged
            in-app or via email at least 14 days before they take effect. Continuing to use the
            service after that means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">14. Governing law &amp; disputes</h2>
          <p>
            These terms are governed by the laws of the Republic of South Africa. The South
            African courts have non-exclusive jurisdiction over any dispute. We ask you to
            contact us at <a href="mailto:support@stokiapp.com" className="text-brand underline">support@stokiapp.com</a>{' '}
            first so we can try to resolve things informally.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">15. Contact</h2>
          <p>
            Questions about these terms? Email us at{' '}
            <a href="mailto:support@stokiapp.com" className="text-brand underline">support@stokiapp.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--card-border)' }}>
        <a href="/login" className="text-brand text-sm font-semibold">← Back to sign in</a>
      </div>
    </div>
  )
}
