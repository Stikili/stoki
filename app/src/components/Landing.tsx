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
    <section className="flex items-center justify-center px-5 sm:px-8 pt-24 sm:pt-32 pb-12 sm:pb-20 min-h-[100dvh] sm:min-h-0">
      <div className="max-w-2xl w-full mx-auto text-center">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-4"
          style={{ color: 'var(--muted-dim)' }}
        >
          Built for South African shops &amp; SMMEs
        </p>
        {/* Two-line headline: emotional lead in white, differentiator in
            emerald. "Thinks alongside you" is the memorable phrase that
            positions Stoki as an ally, not a tool — and covers spaza,
            services, and formal SMMEs equally. */}
        <h1
          className="text-[36px] sm:text-[56px] font-bold tracking-tight leading-[1.05] mb-5"
          style={{ color: 'var(--foreground)' }}
        >
          You run the business.{' '}
          <span style={{ color: '#00e0a0' }}>Stoki thinks alongside you.</span>
        </h1>
        <p
          className="text-[16px] sm:text-[18px] leading-relaxed mb-8 max-w-xl mx-auto"
          style={{ color: 'var(--muted)' }}
        >
          Your business assistant on WhatsApp or the web &mdash; selling, invoicing, paying staff, and answering questions like <em>&ldquo;who owes me?&rdquo;</em> and <em>&ldquo;can I afford to hire?&rdquo;</em> Grounded in your numbers and the South African economy.
        </p>
        <div className="flex items-center justify-center">
          <Link
            href="/login?intent=register"
            className="btn-gloss inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-[15px]"
          >
            <span className="relative z-10">Sign up free</span>
            <ArrowRight size={16} strokeWidth={2.4} className="relative z-10" />
          </Link>
        </div>
        <p className="text-[12px] mt-4" style={{ color: 'var(--muted-dim)' }}>
          Free for your first store · No card required · 90-day Business trial
        </p>
      </div>
    </section>
  )
}

function SlideFeatures() {
  return (
    <section className="flex items-center justify-center px-5 sm:px-8 pt-24 sm:pt-12 pb-16 min-h-[100dvh] sm:min-h-0">
      <div className="max-w-3xl w-full mx-auto">
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
          <FeatureMini
            icon={<ShoppingCart size={18} strokeWidth={1.7} />}
            title="Point-of-sale"
            body="VAT-aware receipts, every payment method, returns, weighables, airtime."
          />
          <FeatureMini
            icon={<Package size={18} strokeWidth={1.7} />}
            title="Stock"
            body="Restocks, wastage, expiry alerts, stocktake, valuation, POs."
          />
        </div>

        {/* Proof strip — capability anchors, not user counts. Defensible
            against what's actually shipped in the product. */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <ProofChip label="5 SA banks"        hint="bank rec via CSV" />
          <ProofChip label="PAYE · UIF · SDL"  hint="EMP201 export" />
          <ProofChip label="30-day forecast"   hint="cash you'll have" />
          <ProofChip label="Works offline"     hint="load-shedding ready" />
        </div>
      </div>
    </section>
  )
}

function ProofChip({ label, hint }: { label: string; hint: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-center"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
      }}
    >
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
  return (
    <section className="flex items-center justify-center px-5 sm:px-8 pt-24 sm:pt-12 pb-16 min-h-[100dvh] sm:min-h-0">
      <div className="max-w-md w-full mx-auto text-center">
        <div className="card-glass p-8 sm:p-10">
          <h2
            className="text-[26px] sm:text-[30px] font-bold tracking-tight mb-2"
            style={{ color: 'var(--foreground)' }}
          >
            Ready when you are.
          </h2>
          <p className="text-[15px] mb-6" style={{ color: 'var(--muted)' }}>
            In your first hour: record a sale, do a cash-up, ask Stoki what to reorder tomorrow.
          </p>
          <Link
            href="/login?intent=register"
            className="btn-gloss inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-[15px] w-full"
          >
            <span className="relative z-10">Sign up free</span>
            <ArrowRight size={16} strokeWidth={2.4} className="relative z-10" />
          </Link>
        </div>
        <p className="mt-6 text-[11px]" style={{ color: 'var(--muted-dim)' }}>
          By continuing you agree to our{' '}
          <Link href="/privacy" className="underline" style={{ color: 'var(--muted)' }}>Privacy Policy</Link>
          {' '}&amp;{' '}
          <Link href="/terms" className="underline" style={{ color: 'var(--muted)' }}>Terms</Link>.
        </p>

        {/* Two labelled contact points: hello@ for prospects wanting to
            introduce themselves or ask general questions, support@ for
            technical or account help. Split so the right message lands
            with the right person / SLA. */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[11px]" style={{ color: 'var(--muted-dim)' }}>
          <a
            href="mailto:hello@stokiapp.com?subject=Hello%20Stoki"
            className="inline-flex items-center gap-1.5 underline"
            style={{ color: 'var(--muted)' }}
          >
            Say hello · <span className="font-medium">hello@stokiapp.com</span>
          </a>
          <span className="hidden sm:inline" style={{ color: 'var(--card-border)' }}>·</span>
          <a
            href="mailto:support@stokiapp.com?subject=Stoki%20support"
            className="inline-flex items-center gap-1.5 underline"
            style={{ color: 'var(--muted)' }}
          >
            Need help · <span className="font-medium">support@stokiapp.com</span>
          </a>
        </div>

        <p className="mt-4 text-[10.5px]" style={{ color: 'var(--muted-dim)' }}>
          Stoki (Pty) Ltd · Reg. K2026258855
        </p>
      </div>
    </section>
  )
}

// ── Helper — single feature card ───────────────────────────────────────────

function FeatureMini({
  icon, title, body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
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
