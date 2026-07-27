'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ShoppingCart, Package, CreditCard, Sparkles, ArrowRight, Receipt, Activity,
} from 'lucide-react'
import Wordmark from '@/components/Wordmark'
import ThemeToggle from '@/components/ThemeToggle'

/**
 * Public marketing / landing page.
 *
 * On mobile (<768px) the page is a horizontal swipe deck — three slides,
 * one per viewport, snapped via CSS scroll-snap. On desktop the same
 * markup reads as a classic stacked landing.
 *
 * The deck is intentionally short — Hero, Features, CTA — so the user can
 * decide quickly whether to sign up. Detailed sales copy lives in /privacy
 * and the eventual marketing site, not here.
 *
 * Header has a single "Sign in" affordance styled identically to the hero's
 * "Sign up free" CTA so the two pre-auth buttons read as a matching pair.
 * The hero only shows "Sign up free" — the header carries the sign-in path.
 */
export default function Landing() {
  const deckRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  // Update the pagination dot as the user swipes between slides. Rounds to
  // the nearest slide boundary so React only re-renders at boundaries, not
  // every scroll tick.
  useEffect(() => {
    const deck = deckRef.current
    if (!deck) return
    const onScroll = () => {
      const w = deck.clientWidth
      if (w === 0) return
      setActive(Math.round(deck.scrollLeft / w))
    }
    deck.addEventListener('scroll', onScroll, { passive: true })
    return () => deck.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="stoki-login min-h-screen flex flex-col relative">
      {/* Background orbs — anchored to viewport so they stay put while the
          deck scrolls horizontally on mobile. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 45% at 50% 18%, rgba(0, 201, 141, 0.18) 0%, rgba(0, 201, 141, 0.04) 45%, transparent 75%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(40% 40% at 90% 90%, rgba(56, 100, 220, 0.10) 0%, transparent 65%)',
        }}
      />

      {/* Top bar — fixed so it stays visible while the deck swipes.
          The "Sign in" button mirrors the hero's "Sign up free" so the two
          CTAs read as a matched pair across the page. */}
      <header
        className="fixed top-0 inset-x-0 z-10 flex items-center justify-between px-5 sm:px-8 py-4 max-w-6xl w-full mx-auto"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        {/* Sized to match the Sign in button height (~42px) so the brand
            reads as an equal-weight anchor against the CTA. */}
        <Wordmark height={42} textColor="var(--foreground)" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="btn-gloss inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 font-semibold text-[14px]"
          >
            <span className="relative z-10">Sign in</span>
          </Link>
        </div>
      </header>

      {/* Deck — horizontal scroll-snap on mobile, normal block flow on desktop. */}
      <div ref={deckRef} className="landing-deck flex-1">
        <SlideHero />
        <SlideFeatures />
        <SlideCta />
      </div>

      {/* Pagination dots — visible on mobile only, driven by `active` state. */}
      <div className="landing-dots" aria-hidden>
        {[0, 1, 2].map(i => (
          <span key={i} className={`landing-dot ${active === i ? 'is-active' : ''}`} />
        ))}
      </div>
    </div>
  )
}

// ── Slides ─────────────────────────────────────────────────────────────────

function SlideHero() {
  return (
    <section className="relative flex items-center px-5 sm:px-8 pt-24 sm:pt-20 pb-12 sm:pb-20 min-h-[100dvh] sm:min-h-0">
      {/* Split hero — desktop: copy left, phone right. Mobile: text-only
          (phone lives in SlideFeatures on mobile so the hero fits in one
          viewport height for the swipe deck). Standard SaaS hero pattern
          (Linear, Vercel, Notion, Attio). */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
        {/* Copy column — centered on mobile, left-aligned on desktop */}
        <div className="text-center lg:text-left">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-4"
            style={{ color: 'var(--muted-dim)' }}
          >
            Built for South African spazas, service businesses &amp; SMMEs
          </p>
          <h1
            className="text-[36px] sm:text-[52px] lg:text-[60px] font-bold tracking-tight leading-[1.05] mb-5"
            style={{ color: 'var(--foreground)' }}
          >
            Run your business{' '}
            <span style={{ color: '#00e0a0' }}>without the chaos.</span>
          </h1>
          <p
            className="text-[16px] sm:text-[18px] leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0"
            style={{ color: 'var(--muted)' }}
          >
            From your first sale to your next SARS submission, one app. With an AI assistant that knows the SA economy and works offline.
          </p>
          <div className="flex items-center justify-center lg:justify-start">
            <Link
              href="/register"
              className="btn-gloss inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-[15px]"
            >
              <span className="relative z-10">Sign up free</span>
              <ArrowRight size={16} strokeWidth={2.4} className="relative z-10" />
            </Link>
          </div>
          <p className="text-[12px] mt-4" style={{ color: 'var(--muted-dim)' }}>
            Free for your first store · No card required
          </p>
        </div>

        {/* Phone visual — desktop only. Mobile users see the same
            screenshot at the top of SlideFeatures to keep the hero
            viewport tight for the swipe deck. */}
        <div aria-hidden className="hidden lg:flex justify-center lg:justify-end">
          <div
            className="relative"
            style={{ maxWidth: 360, width: '100%' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/screenshots/dashboard-mobile.png"
              alt=""
              className="w-full h-auto rounded-[36px]"
              style={{
                boxShadow:
                  '0 40px 100px -30px rgba(0, 224, 160, 0.35), 0 12px 28px -8px rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(0, 224, 160, 0.15)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function SlideFeatures() {
  return (
    <section className="flex items-center justify-center px-5 sm:px-8 pt-24 sm:pt-12 pb-16 min-h-[100dvh] sm:min-h-0">
      <div className="max-w-3xl w-full mx-auto">
        {/* Dashboard preview — mobile-only. Desktop shows the full
            phone in the SlideHero split-screen. On mobile we crop to
            a 4:3 landscape tile showing just the top of the dashboard
            (header + revenue card) — reads as a "product preview"
            rather than "phone showing phone showing phone", and
            takes ~60% less vertical space so the features grid still
            fits inside the swipe-deck viewport. */}
        <div
          aria-hidden
          className="lg:hidden mx-auto mb-6 w-full max-w-[220px]"
        >
          <div
            className="relative w-full overflow-hidden rounded-2xl"
            style={{
              aspectRatio: '4 / 3',
              boxShadow:
                '0 24px 60px -24px rgba(0, 224, 160, 0.35), 0 6px 20px -6px rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(0, 224, 160, 0.18)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/screenshots/dashboard-mobile.png"
              alt=""
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: 'cover', objectPosition: 'top center' }}
            />
          </div>
        </div>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight text-center mb-8"
          style={{ color: 'var(--foreground)' }}
        >
          Everything in one app
        </h2>
        {/* Ordering: lead with what only Stoki has (Money / SARS / Cash flow /
            AI), close with the table-stakes proofs (POS / Stock). Reads as
            "Stoki handles the painful parts of running a business — and of
            course it's also a till and stock book." */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <FeatureMini
            icon={<CreditCard size={18} strokeWidth={1.7} />}
            title="Money in & out"
            body="Credit book, B2B invoices, supplier bills with aging buckets."
          />
          <FeatureMini
            icon={<Receipt size={18} strokeWidth={1.7} />}
            title="SARS-ready"
            body="Tax invoices, VAT201 worksheet, provisional tax, depreciation, payroll."
          />
          <FeatureMini
            icon={<Activity size={18} strokeWidth={1.7} />}
            title="Cash flow"
            body="30-day forecast from your dues, recurring rules and trading rhythm."
          />
          <FeatureMini
            icon={<Sparkles size={18} strokeWidth={1.7} />}
            title="Stoki AI"
            body="Pricing & restock advice. Vision, memory, knows the SA economy."
          />
          {/* Table-stakes features (POS + Stock) hidden on mobile — every
              competitor has these, so they don't sell. Mobile keeps the 4
              differentiators visible; desktop shows all 6. Saves ~130px
              of vertical scroll on the swipe-deck viewport. */}
          <FeatureMini
            className="hidden sm:block"
            icon={<ShoppingCart size={18} strokeWidth={1.7} />}
            title="Point-of-sale"
            body="VAT-aware receipts, every payment method, returns, weighables, airtime."
          />
          <FeatureMini
            className="hidden sm:block"
            icon={<Package size={18} strokeWidth={1.7} />}
            title="Stock"
            body="Restocks, wastage, expiry alerts, stocktake, valuation, POs."
          />
        </div>

        {/* Proof strip — capability anchors, not user counts. Defensible
            against what's actually shipped in the product. */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <ProofChip label="5 SA banks"        hint="native bank feed"       status="soon" />
          <ProofChip label="PAYE · UIF · SDL"  hint="EMP201 export"          status="live" />
          <ProofChip label="30-day forecast"   hint="cash you'll have"       status="live" />
          <ProofChip label="Works offline"     hint="when Wi-Fi doesn't"     status="live" />
        </div>
      </div>
    </section>
  )
}

type ChipStatus = 'live' | 'soon'

/**
 * Feature-anchor chip with an explicit status badge in every state.
 *
 * `soon` is bright emerald (draws the eye — this is what's coming);
 * `live` is a subtle green dot + text (confirms it's shipped without
 * shouting). Making every chip carry ONE explicit status kills the
 * ambiguity that used to exist when only Soon chips were badged —
 * scanning readers could no longer tell whether an un-badged chip
 * meant "live" or "not yet".
 */
function ProofChip({ label, hint, status = 'live' }: {
  label: string
  hint: string
  status?: ChipStatus
}) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-center relative"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
      }}
    >
      {status === 'soon' && (
        <span
          className="absolute -top-1.5 -right-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded-md"
          style={{
            background: '#00C896',
            color: '#0A0E17',
            letterSpacing: '0.06em',
          }}
        >
          Soon
        </span>
      )}
      {status === 'live' && (
        <span
          className="absolute -top-1.5 -right-1.5 inline-flex items-center gap-0.5 text-[8.5px] font-semibold uppercase tracking-wider px-1.5 py-[2px] rounded-md"
          style={{
            background: 'rgba(0, 200, 150, 0.12)',
            color: '#00C896',
            border: '1px solid rgba(0, 200, 150, 0.3)',
            letterSpacing: '0.08em',
          }}
        >
          <span
            aria-hidden
            className="inline-block w-1 h-1 rounded-full"
            style={{ background: '#00C896' }}
          />
          Live
        </span>
      )}
      <p className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
        {label}
      </p>
      <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--muted-dim)' }}>
        {hint}
      </p>
    </div>
  )
}

function SlideCta() {
  const footerLinkClass = 'hover:underline transition-opacity hover:opacity-100'
  const footerLinkStyle = { color: 'var(--muted)', opacity: 0.9 }
  return (
    <section className="flex items-center justify-center px-5 sm:px-8 pt-20 sm:pt-12 pb-12 sm:pb-16 min-h-[100dvh] sm:min-h-0">
      <div className="w-full max-w-4xl mx-auto">
        {/* CTA card — kept narrow (max-w-md) inside the wider footer
            container so the button stays focused while the footer nav
            below has room to breathe as a 3-column grid. */}
        <div className="max-w-md mx-auto text-center">
          <div className="card-glass p-7 sm:p-10">
            <h2
              className="text-[26px] sm:text-[30px] font-bold tracking-tight mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Ready when you are.
            </h2>
            <p className="text-[15px] mb-6" style={{ color: 'var(--muted)' }}>
              In your first hour: record a sale, do a cash-up, see your 30-day forecast.
            </p>
            <Link
              href="/login?intent=register"
              className="btn-gloss inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-[15px] w-full"
            >
              <span className="relative z-10">Sign up free</span>
              <ArrowRight size={16} strokeWidth={2.4} className="relative z-10" />
            </Link>
          </div>
          <p className="mt-4 text-[11px]" style={{ color: 'var(--muted-dim)' }}>
            By continuing you agree to our{' '}
            <Link href="/privacy" className="underline" style={{ color: 'var(--muted)' }}>Privacy Policy</Link>
            {' '}&amp;{' '}
            <Link href="/terms" className="underline" style={{ color: 'var(--muted)' }}>Terms</Link>.
          </p>
        </div>

        {/* Multi-column footer — standard SaaS pattern (Stripe / Vercel /
            Linear / Notion). Three semantic groups: Product / Resources /
            Compare. Mobile HIDES this entire block — the mobile CTA slide
            is single-purpose ("tap Sign up free"); footer links live on
            /compare/*, /features, /about pages which are reachable from
            Google / LinkedIn directly, not from a landing-page footer.
            Saves ~280px vertical scroll on the swipe-deck viewport.
            Section headers are 10px uppercase small-caps (SaaS
            convention). */}
        <div className="hidden sm:grid mt-8 sm:mt-10 grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-6 text-[12px] text-left">
          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2.5"
              style={{ color: 'var(--muted-dim)' }}
            >
              Product
            </div>
            <ul className="space-y-1.5 leading-tight">
              <li><Link href="/pricing" className={footerLinkClass} style={footerLinkStyle}>Pricing</Link></li>
              <li><Link href="/features" className={footerLinkClass} style={footerLinkStyle}>Features</Link></li>
              <li><Link href="/about" className={footerLinkClass} style={footerLinkStyle}>About</Link></li>
              <li><Link href="/status" className={footerLinkClass} style={footerLinkStyle}>Status</Link></li>
            </ul>
          </div>
          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2.5"
              style={{ color: 'var(--muted-dim)' }}
            >
              Resources
            </div>
            <ul className="space-y-1.5 leading-tight">
              <li>
                <Link
                  href="/guides/how-to-submit-vat201-south-africa"
                  className={footerLinkClass}
                  style={footerLinkStyle}
                >
                  VAT201 guide
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@stokiapp.com?subject=Hello%20Stoki"
                  className={footerLinkClass}
                  style={footerLinkStyle}
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/stokiapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLinkClass}
                  style={footerLinkStyle}
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2.5"
              style={{ color: 'var(--muted-dim)' }}
            >
              Compare Stoki with
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 leading-tight">
              <li><Link href="/compare/stoki-vs-loyverse" className={footerLinkClass} style={footerLinkStyle}>Loyverse</Link></li>
              <li><Link href="/compare/stoki-vs-yoco" className={footerLinkClass} style={footerLinkStyle}>Yoco</Link></li>
              <li><Link href="/compare/stoki-vs-xero" className={footerLinkClass} style={footerLinkStyle}>Xero</Link></li>
              <li><Link href="/compare/stoki-vs-sage" className={footerLinkClass} style={footerLinkStyle}>Sage</Link></li>
              <li><Link href="/compare/stoki-vs-ikhokha" className={footerLinkClass} style={footerLinkStyle}>iKhokha</Link></li>
              <li><Link href="/compare/stoki-vs-simplepay" className={footerLinkClass} style={footerLinkStyle}>SimplePay</Link></li>
              <li><Link href="/compare/stoki-vs-zoho-books" className={footerLinkClass} style={footerLinkStyle}>Zoho Books</Link></li>
              <li><Link href="/compare/stoki-vs-quickbooks" className={footerLinkClass} style={footerLinkStyle}>QuickBooks</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom legal line — desktop only (matches the multi-col
            footer visibility above). Mobile keeps only the CTA card +
            "By continuing" line so the whole slide fits in one viewport
            without vertical scroll. */}
        <div
          className="hidden sm:flex mt-6 sm:mt-8 pt-4 flex-col sm:flex-row items-center justify-between gap-2 text-[10.5px]"
          style={{ borderTop: '1px solid var(--card-border)', color: 'var(--muted-dim)' }}
        >
          <span>Stoki (Pty) Ltd · Reg. K2026258855</span>
          <span>
            <Link href="/privacy" className={footerLinkClass} style={footerLinkStyle}>Privacy</Link>
            {' · '}
            <Link href="/terms" className={footerLinkClass} style={footerLinkStyle}>Terms</Link>
          </span>
        </div>
      </div>
    </section>
  )
}

// ── Helper — single feature card ───────────────────────────────────────────

function FeatureMini({
  icon, title, body, className,
}: {
  icon: React.ReactNode
  title: string
  body: string
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 ${className ?? ''}`}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
        style={{
          background: 'rgba(0, 201, 141, 0.12)',
          color: '#34d5a8',
          border: '1px solid rgba(0, 201, 141, 0.30)',
        }}
      >
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
        {title}
      </h3>
      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
        {body}
      </p>
    </div>
  )
}
