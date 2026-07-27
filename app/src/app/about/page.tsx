import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Public /about page — the "who is Stoki" surface. Anonymised
 * deliberately per feedback_founder_anonymity.md: no founder byline,
 * no personal LinkedIn, no "solo founder" framing. Stoki reads as a
 * company, not a solo project.
 *
 * Only company-level identity is surfaced: registered entity name,
 * Cape Town location, LinkedIn COMPANY page, support / hello email
 * addresses, and the mission narrative told in Stoki's own voice
 * ("we" / "our" / "Stoki does X").
 *
 * If you're editing this: keep every mention at the company level.
 * Never add "founded by …", "the team is …", or link to any personal
 * social profile — those violate the anonymity rule.
 */

const SITE = 'https://stokiapp.com'
const PAGE_URL = `${SITE}/about`

export const metadata: Metadata = {
  title: 'About Stoki — the AI business assistant for SA SMMEs',
  description:
    'Stoki is the AI-powered business operating system for South African SMMEs — informal traders, service businesses, and formal VAT-registered small businesses. Built in Cape Town for the SA economy.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'About Stoki',
    description:
      'The AI-powered business operating system for South African SMMEs. Built in Cape Town for the SA economy.',
    images: [{ url: '/og-image.png', width: 1200, height: 627 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Stoki',
    description: 'The AI business assistant for South African SMMEs. Built in Cape Town.',
    images: ['/og-image.png'],
  },
}

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'Stoki',
  legalName: 'Stoki (Pty) Ltd',
  url: SITE,
  logo: `${SITE}/icons/icon-512.png`,
  description:
    'The AI-powered business assistant for South African SMMEs — informal and formal, from a street trader with one product to a VAT-registered business with staff.',
  foundingLocation: {
    '@type': 'Place',
    name: 'Cape Town, South Africa',
  },
  areaServed: {
    '@type': 'Country',
    name: 'South Africa',
  },
  sameAs: ['https://www.linkedin.com/company/stokiapp'],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      email: 'hello@stokiapp.com',
      contactType: 'sales',
      availableLanguage: ['en', 'af', 'zu', 'xh', 'st'],
    },
    {
      '@type': 'ContactPoint',
      email: 'support@stokiapp.com',
      contactType: 'customer support',
      availableLanguage: ['en', 'af', 'zu', 'xh', 'st'],
    },
  ],
}

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'About', item: PAGE_URL },
  ],
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([orgSchema, breadcrumb]) }}
      />

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-16" style={{ color: 'var(--foreground)' }}>
        <nav aria-label="Breadcrumb" className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">›</span>
          <span>About</span>
        </nav>

        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#00C896' }}>
            About Stoki
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
            The AI business assistant for South African SMMEs.
          </h1>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            Built in Cape Town, for the informal and formal small businesses that keep South Africa moving.
          </p>
        </header>

        <section className="space-y-6 text-base leading-relaxed" style={{ color: 'var(--foreground)' }}>
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Why Stoki exists</h2>
            <p style={{ color: 'var(--muted)' }}>
              Most South African SMMEs juggle three or four tools to run a business — a card reader for
              payments, a spreadsheet for stock, WhatsApp to chase customers who owe them money, and an
              accountant to make sense of it all at year-end. Each tool is priced for a different audience,
              built somewhere else, and speaks a language that doesn&apos;t quite fit the SA economy.
            </p>
            <p className="mt-3" style={{ color: 'var(--muted)' }}>
              Stoki collapses all of that into one app — from the till through the books to the tax return —
              and adds an AI advisor that knows what SARB just did to your customers&apos; spending, when the
              next fuel-price change lands, and how close you are to the VAT-registration threshold.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Who we serve</h2>
            <p style={{ color: 'var(--muted)' }}>
              Every kind of South African small business — not just retail, not just spaza. If you take
              money from customers and pay money to suppliers, Stoki is built for you:
            </p>
            <ul className="list-disc ml-5 mt-3 space-y-1.5" style={{ color: 'var(--muted)' }}>
              <li><strong style={{ color: 'var(--foreground)' }}>Informal traders</strong> — spaza shops, general dealers, food stalls, street vendors</li>
              <li><strong style={{ color: 'var(--foreground)' }}>Service businesses</strong> — salons, transport operators, tradespeople, contractors, consultants, mobile operators</li>
              <li><strong style={{ color: 'var(--foreground)' }}>Formal SMMEs</strong> — growing businesses with staff, VAT-registered, working with an accountant</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>What makes us different</h2>
            <ul className="list-disc ml-5 mt-3 space-y-2" style={{ color: 'var(--muted)' }}>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>WhatsApp-native</strong> — sell, invoice, ask questions right from the app your customers already message you on.
              </li>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>AI that knows the SA economy</strong> — SARB rates, fuel prices, SARS deadlines, load-shedding, competitor tracking, SASSA pay-days. Every insight grounded in your numbers <em>and</em> the local market.
              </li>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>Adapts to how you talk</strong> — pick kasi, plain English, professional, or full-accounting technical. One setting, whole app adjusts.
              </li>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>Offline-first</strong> — keep trading through load-shedding and dropped Wi-Fi. Sales queue locally and sync when you&apos;re back online.
              </li>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>Built for SA compliance</strong> — VAT201, PAYE, UIF, SDL, EMP201 are first-class, not afterthoughts you buy as add-ons.
              </li>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>SA-native pricing</strong> — billed in Rand, via a South African payment provider. No forex fees.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Where we&apos;re based</h2>
            <p style={{ color: 'var(--muted)' }}>
              Stoki is built in Cape Town, South Africa. We&apos;re a registered South African company —
              Stoki (Pty) Ltd, registration number K2026258855.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Contact</h2>
            <ul className="space-y-1.5" style={{ color: 'var(--muted)' }}>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>General enquiries:</strong>{' '}
                <a href="mailto:hello@stokiapp.com" className="underline" style={{ color: '#00C896' }}>hello@stokiapp.com</a>
              </li>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>Product support:</strong>{' '}
                <a href="mailto:support@stokiapp.com" className="underline" style={{ color: '#00C896' }}>support@stokiapp.com</a>
              </li>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>LinkedIn:</strong>{' '}
                <a
                  href="https://www.linkedin.com/company/stokiapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: '#00C896' }}
                >
                  linkedin.com/company/stokiapp
                </a>
              </li>
              <li>
                <strong style={{ color: 'var(--foreground)' }}>Privacy questions:</strong>{' '}
                <Link href="/privacy" className="underline" style={{ color: '#00C896' }}>see our POPIA-aligned privacy notice</Link>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section aria-labelledby="cta" className="text-center py-12 mt-10">
          <h2 id="cta" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            Try Stoki free
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Every new account gets a 120-day full-Business trial. Free forever for your first store.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-bold text-sm"
            style={{ background: '#00C896', color: '#0A0E17' }}
          >
            Sign up free →
          </Link>
        </section>

        <footer className="mt-12 pt-6 text-xs text-center" style={{ borderTop: '1px solid var(--card-border)', color: 'var(--muted)' }}>
          Stoki (Pty) Ltd · Reg. K2026258855
        </footer>
      </main>
    </>
  )
}
