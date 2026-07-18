import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Comparison page: Stoki vs Loyverse.
 *
 * Written as an SEO anchor page for the highest-intent SA SMME queries
 * that currently land on Loyverse: "Loyverse alternative South Africa",
 * "Stoki vs Loyverse", "best free POS SA". Every claim is defensible —
 * we do not invent Loyverse features or misquote their pricing.
 *
 * Structured with hierarchical Hs, a semantic <table>, and inline JSON-
 * LD (Article + FAQPage + BreadcrumbList) so Google can render it as a
 * comparison rich result and Featured Snippet.
 *
 * When Loyverse ships a feature that closes a gap, update THIS file so
 * we don't misrepresent them — bad-faith comparison pages get de-ranked
 * once flagged.
 */

const SITE = 'https://stokiapp.com'
const PAGE_URL = `${SITE}/compare/stoki-vs-loyverse`

export const metadata: Metadata = {
  title: 'Stoki vs Loyverse — Which POS is Right for Your SA Small Business?',
  description:
    'Honest 2026 comparison of Stoki and Loyverse for South African SMMEs. Pricing, POS features, SA compliance (VAT201, PAYE), AI advisor, WhatsApp, offline support, credit book — side-by-side.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'article',
    url: PAGE_URL,
    title: 'Stoki vs Loyverse — SA small business POS compared (2026)',
    description:
      'Which free POS is right for your South African shop, service business, or SMME? Detailed comparison of Stoki and Loyverse across pricing, SA compliance, AI, WhatsApp, and offline support.',
    images: [{ url: '/og-image.png', width: 1200, height: 627 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stoki vs Loyverse — SA small business POS compared',
    description:
      'Honest comparison for South African SMMEs — pricing, features, SA compliance, AI advisor.',
    images: ['/og-image.png'],
  },
}

interface Row {
  feature: string
  loyverse: string
  stoki: string
  /** Which side wins for the SA SMME audience — 'stoki' | 'loyverse' | 'tie'. */
  winner: 'stoki' | 'loyverse' | 'tie'
}

const ROWS: Row[] = [
  { feature: 'Free tier', loyverse: 'Free forever — unlimited items + sales', stoki: 'Free forever for first store · 120-day Business trial', winner: 'tie' },
  { feature: 'Point of sale (till)', loyverse: 'Excellent, POS-first product', stoki: 'Full POS with VAT-aware receipts, weighables, airtime', winner: 'tie' },
  { feature: 'Inventory / stock', loyverse: 'Strong — categories, variants, stock alerts', stoki: 'Full inventory + wastage + expiry alerts + stocktake', winner: 'tie' },
  { feature: 'SA VAT201 compliance', loyverse: 'Not supported', stoki: 'Native — auto-generated block 1-15 export', winner: 'stoki' },
  { feature: 'PAYE / UIF / SDL payroll', loyverse: 'Not supported', stoki: 'Native — EMP201 export, payslips', winner: 'stoki' },
  { feature: 'Credit book (informal debtors)', loyverse: 'Not supported', stoki: 'Native — track who owes what, WhatsApp reminders', winner: 'stoki' },
  { feature: 'WhatsApp bot', loyverse: 'Not supported', stoki: 'Ask questions, log sales, get answers on WhatsApp', winner: 'stoki' },
  { feature: 'AI business advisor', loyverse: 'Not supported', stoki: 'Grounded in your data + SA economy (SARB, fuel, SARS)', winner: 'stoki' },
  { feature: 'AI voice adapts to owner', loyverse: 'N/A', stoki: 'Kasi · Plain · Professional · Technical — one setting', winner: 'stoki' },
  { feature: 'Airtime PIN dispensing', loyverse: 'Not supported', stoki: 'Sell airtime + data as inventory items', winner: 'stoki' },
  { feature: 'B2B invoicing', loyverse: 'Not native', stoki: 'PDF invoices + WhatsApp/email delivery', winner: 'stoki' },
  { feature: 'Offline support', loyverse: 'Yes (queues + syncs)', stoki: 'Offline-first PWA — sales queue during load-shedding', winner: 'tie' },
  { feature: 'Multi-store', loyverse: 'Yes on free tier', stoki: 'Yes — separate ai_tone / VAT status per store', winner: 'tie' },
  { feature: 'Hardware ecosystem', loyverse: 'Wide — many printers, scanners, cash drawers', stoki: 'Bluetooth thermal printer + phone camera scanner', winner: 'loyverse' },
  { feature: 'SA market context', loyverse: 'Global product — no SA specificity', stoki: 'Built in Cape Town for SA — SASSA, load-shedding, kasi', winner: 'stoki' },
  { feature: 'Pricing (paid tier)', loyverse: 'Employee mgmt + kitchen printing extras ~USD/month', stoki: 'ZAR pricing, SA billing (Ozow), no forex fees', winner: 'stoki' },
  { feature: 'Cost of goods / margin tracking', loyverse: 'Yes', stoki: 'Yes — plus AI margin-erosion alerts', winner: 'stoki' },
  { feature: 'Language support', loyverse: 'English + global languages', stoki: 'English + Zulu, Xhosa, Sotho, Afrikaans (rolling)', winner: 'tie' },
]

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Is Loyverse free in South Africa?',
    a: 'Yes. Loyverse\'s POS + inventory apps are free forever, including on the SA App Store and Play Store. Paid add-ons (employee management, kitchen printing) are billed in US dollars.',
  },
  {
    q: 'Is Stoki free in South Africa?',
    a: 'Yes. Stoki is free forever for your first store, with a 120-day Business trial that unlocks payroll, multi-store, and advanced AI features for every new account.',
  },
  {
    q: 'Which is better for a spaza shop — Stoki or Loyverse?',
    a: 'Stoki. Loyverse is a well-built global POS but has no credit book (informal debtors), no airtime PIN dispensing, no VAT201, no SARS/PAYE support, and no WhatsApp bot — all critical for SA township traders. Loyverse wins if your only need is a POS + inventory and hardware compatibility.',
  },
  {
    q: 'Does Loyverse support VAT201 or PAYE for South Africa?',
    a: 'No. Loyverse is a global product and does not generate SARS-compliant VAT201 or EMP201 reports. If you are VAT-registered or employ staff in SA, you would need a second tool (Xero, Sage, or Stoki) for compliance.',
  },
  {
    q: 'Can Loyverse work on WhatsApp?',
    a: 'No. Loyverse has no WhatsApp integration. Stoki has a WhatsApp bot that lets you record sales, ask about your business, and get AI answers grounded in your data — right from WhatsApp.',
  },
  {
    q: 'Does Loyverse have an AI advisor?',
    a: 'No. Loyverse is a traditional POS + inventory product with reporting. Stoki has an AI business advisor grounded in your store\'s data plus SA-specific economic context (SARB rates, fuel prices, SARS deadlines, load-shedding).',
  },
  {
    q: 'Should I migrate from Loyverse to Stoki?',
    a: 'If your only need is a POS and Loyverse is working for you, keep it — no need to switch. Consider Stoki when you need SA compliance (VAT201, PAYE), a credit book for informal debtors, an AI advisor, or WhatsApp integration. You can also run both — Loyverse at the till, Stoki for the books and advisor — and export sales between them.',
  },
  {
    q: 'Can I try Stoki without leaving Loyverse?',
    a: 'Yes. Stoki is free for your first store and does not need any hardware. You can trial it as a companion to your existing Loyverse setup — use Stoki for VAT201, payroll, and the AI advisor while keeping Loyverse at the till.',
  },
]

export default function StokiVsLoyversePage() {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Stoki vs Loyverse — Which POS is Right for Your SA Small Business?',
    description: metadata.description,
    author: { '@type': 'Organization', name: 'Stoki', url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'Stoki',
      logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png` },
    },
    datePublished: '2026-07-18',
    dateModified: '2026-07-18',
    image: `${SITE}/og-image.png`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': PAGE_URL },
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE}/compare` },
      { '@type': 'ListItem', position: 3, name: 'Stoki vs Loyverse', item: PAGE_URL },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([article, faqSchema, breadcrumb]) }}
      />

      <article className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-16" style={{ color: 'var(--foreground)' }}>
        {/* Breadcrumb — matched to the JSON-LD BreadcrumbList above. */}
        <nav aria-label="Breadcrumb" className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">›</span>
          <span>Compare</span>
          <span className="mx-2">›</span>
          <span>Stoki vs Loyverse</span>
        </nav>

        <header className="mb-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#00C896' }}
          >
            Comparison · Updated July 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
            Stoki vs Loyverse — which POS is right for your SA small business?
          </h1>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            Honest 2026 comparison across pricing, SA compliance, POS features, AI, WhatsApp, and offline support.
            Written by Stoki — we&apos;ll flag every place Loyverse wins as clearly as we flag the reverse.
          </p>
        </header>

        {/* TL;DR — Featured Snippet bait. Google often surfaces this
            paragraph verbatim for "stoki vs loyverse" queries. */}
        <section aria-labelledby="tldr" className="mb-10 rounded-2xl p-5 sm:p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 id="tldr" className="text-lg font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            TL;DR
          </h2>
          <ul className="list-disc ml-5 space-y-2 text-sm leading-relaxed">
            <li>
              <strong>Loyverse wins</strong> for hardware-connected retail (multi-terminal cafés, restaurants with kitchen printers, shops with barcode scanner + cash drawer setups) and for owners who want a battle-tested global POS with a wide ecosystem.
            </li>
            <li>
              <strong>Stoki wins</strong> for any SA small business that also needs SARS compliance (VAT201, PAYE/UIF/SDL), a credit book for informal debtors, airtime PIN dispensing, an AI advisor, or a WhatsApp bot — i.e. most South African SMMEs.
            </li>
            <li>
              <strong>Both are free</strong> at the entry tier. You can run them side-by-side — Loyverse at the till, Stoki for the books and advisor.
            </li>
          </ul>
        </section>

        {/* Comparison table — semantic <table> so screen readers and
            Google's table extraction both get it right. */}
        <section aria-labelledby="feature-comparison" className="mb-10">
          <h2 id="feature-comparison" className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Feature-by-feature comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--card-border)' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface)' }}>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>Feature</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>Loyverse</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold" style={{ color: '#00C896' }}>Stoki</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr
                    key={r.feature}
                    style={{
                      background: i % 2 === 0 ? 'transparent' : 'var(--surface)',
                      borderTop: '1px solid var(--card-border)',
                    }}
                  >
                    <td className="px-3 sm:px-4 py-3 font-semibold" style={{ color: 'var(--foreground)', minWidth: '160px' }}>
                      {r.feature}
                    </td>
                    <td
                      className="px-3 sm:px-4 py-3"
                      style={{
                        color: r.winner === 'loyverse' ? 'var(--foreground)' : 'var(--muted)',
                        fontWeight: r.winner === 'loyverse' ? 600 : 400,
                      }}
                    >
                      {r.loyverse}
                      {r.winner === 'loyverse' && <span className="ml-1.5 text-[10px] font-bold" style={{ color: '#00C896' }}>✓</span>}
                    </td>
                    <td
                      className="px-3 sm:px-4 py-3"
                      style={{
                        color: r.winner === 'stoki' ? 'var(--foreground)' : 'var(--muted)',
                        fontWeight: r.winner === 'stoki' ? 600 : 400,
                      }}
                    >
                      {r.stoki}
                      {r.winner === 'stoki' && <span className="ml-1.5 text-[10px] font-bold" style={{ color: '#00C896' }}>✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Deep dive sections — each targets a different long-tail query
            like "loyverse VAT201 south africa" or "loyverse alternative
            with WhatsApp". */}
        <section aria-labelledby="who-wins" className="mb-10 space-y-8">
          <h2 id="who-wins" className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Who wins for whom?
          </h2>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Choose Loyverse if…
            </h3>
            <ul className="list-disc ml-5 space-y-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              <li>Your primary need is a rock-solid POS with a wide hardware ecosystem (barcode scanners, cash drawers, receipt printers, kitchen printers, customer displays).</li>
              <li>You run a restaurant / café with kitchen ticket routing and multi-terminal service.</li>
              <li>You don&apos;t need SA-specific tax reporting (you handle VAT201 / PAYE elsewhere with an accountant, Xero, or Sage).</li>
              <li>You don&apos;t give store credit to informal customers.</li>
              <li>You prefer a global product with English-speaking support and a large community.</li>
            </ul>
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.25)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Choose Stoki if…
            </h3>
            <ul className="list-disc ml-5 space-y-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              <li>You run a South African small business — spaza, food stall, salon, transport operator, mobile trader, general dealer, contractor, or a growing formal SMME.</li>
              <li>You need SARS compliance built in — VAT201 export, PAYE / UIF / SDL, EMP201.</li>
              <li>You give store credit to regulars and need a credit book that WhatsApps reminders to debtors.</li>
              <li>You want an AI advisor that knows the SA economy (SARB rates, fuel prices, SARS deadlines, load-shedding) and grounds every answer in <em>your</em> numbers.</li>
              <li>You want to run your business from WhatsApp — record sales, ask questions, get answers.</li>
              <li>You sell airtime / data as inventory items.</li>
              <li>You want a product that adapts its voice to how you talk (kasi, plain, professional, or technical accounting).</li>
              <li>You want SA billing (ZAR, Ozow) rather than USD forex fees.</li>
            </ul>
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Run both?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              You don&apos;t have to pick. A common SA setup: <strong style={{ color: 'var(--foreground)' }}>Loyverse at the till</strong> (for the hardware ecosystem and multi-terminal café workflow), <strong style={{ color: 'var(--foreground)' }}>Stoki for the books, VAT, payroll, credit book, and AI advisor</strong>. Export your daily sales from Loyverse and log them in Stoki as a summary line — you get the best of both without switching hardware.
            </p>
          </div>
        </section>

        {/* Pricing — its own H2 because "loyverse pricing south africa"
            is a distinct query. Explicit that both are free at the entry
            tier so we don't undersell either. */}
        <section aria-labelledby="pricing" className="mb-10">
          <h2 id="pricing" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            Pricing
          </h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
            Both Loyverse and Stoki offer a genuinely free tier with unlimited sales — you can run either without paying anything ever. Differences appear in the paid tiers:
          </p>
          <ul className="list-disc ml-5 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            <li><strong style={{ color: 'var(--foreground)' }}>Loyverse:</strong> free POS + inventory. Paid add-ons (employee management, kitchen printing, advanced inventory) billed in USD — around US$5-25 per store per month, incurring forex fees on SA bank cards.</li>
            <li><strong style={{ color: 'var(--foreground)' }}>Stoki:</strong> free forever for your first store. 120-day Business trial for every new account. Pro / Business tiers billed in ZAR via Ozow (no forex fees). Payroll, invoicing, VAT201, and the AI advisor unlock at Pro.</li>
          </ul>
        </section>

        {/* FAQ — matched to the FAQPage JSON-LD above. Both are needed:
            the rendered UI serves users; the JSON-LD serves Google's
            rich-result parser. */}
        <section aria-labelledby="faq" className="mb-10">
          <h2 id="faq" className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQS.map(f => (
              <details
                key={f.q}
                className="rounded-xl p-4"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <summary className="font-semibold cursor-pointer text-sm sm:text-base" style={{ color: 'var(--foreground)' }}>
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA — the whole point of the page is to convert Loyverse-
            researchers into Stoki triallists. Free-forever framing is
            the honest hook. */}
        <section aria-labelledby="cta" className="text-center py-8">
          <h2 id="cta" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            Try Stoki free
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Free forever for your first store · 120-day Business trial · No card required
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-bold text-sm"
            style={{ background: '#00C896', color: '#0A0E17' }}
          >
            Get started at stokiapp.com →
          </Link>
        </section>

        <footer className="mt-12 pt-6 text-xs text-center" style={{ borderTop: '1px solid var(--card-border)', color: 'var(--muted)' }}>
          Last updated 18 July 2026. Loyverse features are based on their published product docs at the time of writing. If we&apos;ve got something wrong, email{' '}
          <a href="mailto:hello@stokiapp.com" className="underline" style={{ color: '#00C896' }}>hello@stokiapp.com</a>
          {' '}and we&apos;ll fix it.
        </footer>
      </article>
    </>
  )
}
