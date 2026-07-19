import type { Metadata } from 'next'
import Link from 'next/link'
import WaitlistForm from './WaitlistForm'

/**
 * Public pricing page.
 *
 * State today: Free tier is live and fully described (sign-up CTA).
 * Pro / Business tiers show real ZAR pricing anchors but are gated
 * behind a "Join waitlist" flow because Ozow billing integration is
 * stashed until merchant credentials arrive. Enterprise is a mailto.
 *
 * When Ozow lands, the tier cards flip from waitlist to real
 * checkout — one edit to this file, no schema changes required.
 * The waitlist emails collected in the interim become the launch
 * outreach list.
 */

const SITE = 'https://stokiapp.com'
const PAGE_URL = `${SITE}/pricing`

export const metadata: Metadata = {
  title: 'Pricing — free forever for your first store',
  description:
    "Stoki pricing for South African SMMEs. Free forever tier. Pro R99/month, Business R249/month, Enterprise from R899/month — launching alongside our SA payment integration. Join the waitlist.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'Stoki pricing — free forever for your first store',
    description:
      'Free tier for SA SMMEs. Pro R99/mo, Business R249/mo, Enterprise from R899/mo — join the waitlist for launch.',
    images: [{ url: '/og-image.png', width: 1200, height: 627 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stoki pricing — free forever for your first store',
    description: 'Free tier live. Pro (R99) / Business (R249) — join the waitlist.',
    images: ['/og-image.png'],
  },
}

// JSON-LD PriceSpecification per tier — Google can render pricing rich
// results on SERPs when this structured data is present. Prices mirror
// the internal /settings/billing page — single source of truth.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Stoki',
  description: 'The AI-powered business assistant for South African SMMEs.',
  brand: { '@type': 'Brand', name: 'Stoki' },
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'ZAR',
      availability: 'https://schema.org/InStock',
      url: `${SITE}/login?intent=register`,
      description: 'Free forever for your first store. POS, inventory, credit book, VAT201 export, 20 AI advisor questions/day.',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '99',
      priceCurrency: 'ZAR',
      availability: 'https://schema.org/PreOrder',
      url: PAGE_URL,
      description: 'R99/month. B2B invoicing, payables, bank reconciliation, unlimited AI advisor + 7 Pro insights, accounting exports. Launching alongside SA payment integration.',
    },
    {
      '@type': 'Offer',
      name: 'Business',
      price: '249',
      priceCurrency: 'ZAR',
      availability: 'https://schema.org/PreOrder',
      url: PAGE_URL,
      description: 'R249/month. Everything in Pro plus payroll (PAYE/UIF/SDL/EMP201), multi-store (up to 3), team (up to 5), WhatsApp broadcasts, fixed assets.',
    },
    {
      '@type': 'Offer',
      name: 'Enterprise',
      price: '899',
      priceCurrency: 'ZAR',
      availability: 'https://schema.org/PreOrder',
      url: 'mailto:hello@stokiapp.com',
      description: 'From R899/month. Unlimited stores + team, dedicated account manager, SLA-backed uptime.',
    },
  ],
}

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-16" style={{ color: 'var(--foreground)' }}>
        <nav aria-label="Breadcrumb" className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">›</span>
          <span>Pricing</span>
        </nav>

        <header className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#00C896' }}>
            Pricing · ZAR, no forex fees
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
            Free forever for your first store.
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--muted)' }}>
            Pro and Business tiers launching alongside our SA payment integration.
            Join the waitlist — we&apos;ll email you the moment they&apos;re live.
          </p>
        </header>

        {/* Tier grid — Free is live, Pro + Business are waitlist,
            Enterprise is contact-us. Feature lists are the authoritative
            copy from /settings/billing/page.tsx so a visitor sees the
            same story on the marketing page and inside the app. When
            the internal billing page's features change, mirror the edit
            here — no other source of truth exists yet. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Free — live */}
          <TierCard
            name="Free"
            subtitle="for the spaza on day one"
            price="R0"
            priceNote="forever"
            headline="Everything you need to start"
            features={[
              '1 store, 1 user',
              'Unlimited products & sales',
              'Credit book + WhatsApp reminders',
              'Cash up, stocktake, prices, airtime, expenses',
              '20 AI advisor questions / day',
              'All auto-pushed alerts (low stock, expiry, weather, fuel day…)',
              'Weekly reports',
              'VAT201 export',
              'Offline PWA',
            ]}
            cta={{ label: 'Sign up free', href: '/login?intent=register', kind: 'primary' }}
            statusBadge="live"
          />

          {/* Pro — waitlist */}
          <TierCard
            name="Pro"
            subtitle="going formal — SARS, B2B customers"
            price="R99"
            priceNote="/month"
            priceAnnual="R990/year — 2 months free"
            headline="Formal SMME essentials"
            features={[
              'Everything in Free',
              '2 team members (owner + 1)',
              'B2B invoicing (SARS tax invoices)',
              'B2B customer book with payment terms',
              'Supplier payables + aging',
              'Purchase orders',
              'Bank reconciliation (FNB / Standard / ABSA / Nedbank / Capitec CSVs)',
              'Unlimited AI advisor + 7 Pro insights',
              'Provisional tax estimator + cashflow forecast',
              'Accounting exports (Xero / Sage)',
            ]}
            waitlistPlan="pro"
            waitlistLabel="Pro"
            statusBadge="soon"
          />

          {/* Business — waitlist */}
          <TierCard
            name="Business"
            subtitle="growing — employees, multi-shop"
            price="R249"
            priceNote="/month"
            priceAnnual="R2,490/year — 2 months free"
            headline="For growing SMMEs"
            features={[
              'Everything in Pro',
              'Payroll — PAYE / UIF / SDL + EMP201 export',
              'Fixed asset register + depreciation',
              'WhatsApp broadcasts (Meta templates)',
              'Up to 3 stores + cross-store reports',
              'Up to 5 team members',
              'Priority WhatsApp support (4-hour, business hours)',
            ]}
            waitlistPlan="business"
            waitlistLabel="Business"
            statusBadge="soon"
          />

          {/* Enterprise — contact */}
          <TierCard
            name="Enterprise"
            subtitle="chains, franchises, 10+ shops"
            price="From R899"
            priceNote="/month"
            priceAnnual="Contact sales for custom pricing"
            headline="Multi-shop chains"
            features={[
              'Everything in Business',
              'Unlimited stores + team members',
              'Dedicated account manager',
              'Custom onboarding + training',
              'SLA-backed uptime (99.5% target)',
              'Priority feature requests',
            ]}
            cta={{
              label: 'Contact sales',
              href: 'mailto:hello@stokiapp.com?subject=Enterprise%20enquiry',
              kind: 'ghost',
            }}
          />
        </div>

        {/* Why free tier is genuinely free — anticipates "what's the catch" */}
        <section className="mt-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            Why the free tier is genuinely free
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            Every SA small business deserves professional tools — not a 14-day trial that expires the week
            rent is due. Free forever means your first store never pays a cent. We monetise Pro / Business
            for growing SMMEs who genuinely need the deeper features. If Stoki adds real value to your
            business, you&apos;ll graduate to a paid tier when it makes sense — not before.
          </p>
          <p className="text-xs mt-4" style={{ color: 'var(--muted-dim)' }}>
            Every new account also gets a 120-day Business trial — full feature set, no card required.
          </p>
        </section>

        {/* FAQ - kept short. Full FAQ lives in the app, this is
            just the pricing-specific unknowns. */}
        <section className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Pricing questions
          </h2>
          <div className="space-y-3">
            {PRICING_FAQS.map(f => (
              <details
                key={f.q}
                className="rounded-xl p-4"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <summary className="font-semibold cursor-pointer text-sm sm:text-base" style={{ color: 'var(--foreground)' }}>
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

// ─── Tier card ──────────────────────────────────────────────────────

interface TierCardProps {
  name: string
  subtitle: string
  price: string
  priceNote: string
  priceAnnual?: string
  headline: string
  features: string[]
  cta?: { label: string; href: string; kind: 'primary' | 'ghost' }
  waitlistPlan?: 'pro' | 'business' | 'enterprise'
  waitlistLabel?: string
  statusBadge?: 'live' | 'soon'
}

function TierCard({ name, subtitle, price, priceNote, priceAnnual, headline, features, cta, waitlistPlan, waitlistLabel, statusBadge }: TierCardProps) {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6 flex flex-col relative"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      {statusBadge && (
        <span
          className="absolute -top-2 -right-2 text-[9.5px] font-bold uppercase tracking-wider px-2 py-[3px] rounded-md"
          style={{
            background: statusBadge === 'live' ? 'rgba(0, 200, 150, 0.12)' : '#00C896',
            color: statusBadge === 'live' ? '#00C896' : '#0A0E17',
            border: statusBadge === 'live' ? '1px solid rgba(0, 200, 150, 0.35)' : 'none',
            letterSpacing: '0.08em',
          }}
        >
          {statusBadge === 'live' ? '✓ Live' : 'Soon'}
        </span>
      )}

      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>{name}</p>
      <p className="text-[11px] mb-3" style={{ color: 'var(--muted-dim)' }}>{subtitle}</p>
      <div className="flex items-baseline gap-1 mb-1">
        <p className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--foreground)' }}>{price}</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>{priceNote}</p>
      </div>
      {priceAnnual && (
        <p className="text-[11px] mb-1" style={{ color: 'var(--muted-dim)' }}>{priceAnnual}</p>
      )}
      <p className="text-sm mb-5 mt-1" style={{ color: 'var(--muted)' }}>{headline}</p>

      <ul className="flex flex-col gap-1.5 mb-6 flex-1">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2 text-[13px] leading-snug" style={{ color: 'var(--foreground)' }}>
            <span className="mt-0.5" aria-hidden style={{ color: '#00C896' }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {cta && (
        <Link
          href={cta.href}
          className="text-center rounded-xl py-3 text-sm font-semibold"
          style={
            cta.kind === 'primary'
              ? { background: '#00C896', color: '#0A0E17' }
              : {
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--card-border)',
                }
          }
        >
          {cta.label}
        </Link>
      )}

      {waitlistPlan && waitlistLabel && (
        <WaitlistForm plan={waitlistPlan} planLabel={waitlistLabel} />
      )}
    </div>
  )
}

const PRICING_FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Is the free tier really free forever?',
    a: 'Yes. No time limit, no card required, no auto-conversion. Your first store keeps all listed Free-tier features indefinitely. We only ask for payment when you invite a teammate (Pro), open a second store (Business), or unlock advanced features like payroll, invoicing, or the 7 Pro AI insights.',
  },
  {
    q: 'Why can I not buy Pro or Business today?',
    a: "We're integrating a South African payment provider (Ozow) to bill in ZAR without forex fees. The paid tiers unlock the moment integration lands — expected within weeks. Joining the waitlist means we email you the moment it's live, and early joiners get first access to any launch pricing.",
  },
  {
    q: 'Do you charge in USD?',
    a: "No. All Stoki pricing is in South African Rand (ZAR). No forex fees, no exchange-rate surprises, billed via a local SA payment provider once we're live.",
  },
  {
    q: "What's the 120-day trial?",
    a: "Every new account starts with 120 days of full Business-tier access — every feature unlocked, no card required. If you don't upgrade at the end, your account falls back to the Free tier with your data preserved. This gives you four months to genuinely test whether Stoki fits your business.",
  },
  {
    q: "What's the difference between Pro (R99) and Business (R249)?",
    a: 'Pro is for a formalising single-shop SMME: adds B2B invoicing, supplier payables, bank reconciliation, unlimited AI advisor, and the 7 Pro AI insights, plus one teammate. Business is for a growing business with employees or multiple shops: adds payroll (PAYE/UIF/SDL/EMP201), multi-store (up to 3), team roles (up to 5), fixed assets, WhatsApp broadcasts, and priority support.',
  },
  {
    q: 'Can I switch tiers at any time?',
    a: "Yes, once paid tiers are live. Upgrade takes effect immediately; downgrade takes effect at the next billing cycle so you don't lose paid-tier features mid-period.",
  },
  {
    q: 'What if I have three shops today?',
    a: "Start with the Free tier on your busiest store to see if Stoki fits. Multi-store (up to 3) unlocks on the Business tier; unlimited stores is Enterprise. During your 120-day trial you can add extra stores to test the multi-store workflow before upgrading.",
  },
  {
    q: 'Is the annual plan really 2 months free?',
    a: 'Yes. Pro annual is R990 (vs R99 × 12 = R1,188, saving R198). Business annual is R2,490 (vs R249 × 12 = R2,988, saving R498). Charged once, no monthly admin.',
  },
]
