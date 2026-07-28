'use client'

import Link from 'next/link'
import Wordmark from '@/components/Wordmark'
import ThemeToggle from '@/components/ThemeToggle'

/**
 * Shared fixed header for every public marketing surface (landing +
 * /features, /about, /pricing, /status, /compare/*, /guides/*,
 * /privacy, /terms).
 *
 * Layout: flex justify-between on all viewports so wordmark hugs
 * left and the theme/sign-in cluster hugs right. Nav is absolutely
 * positioned to the visual centre on desktop (Vercel header pattern)
 * so it can't push the CTA cluster off-right on any viewport.
 * Hidden on mobile — the compact nav row on the landing CTA slide
 * (or the pages themselves) surfaces the same links for mobile users.
 *
 * ThemeToggle + Sign-in are the paired control cluster — same
 * rounded-2xl pill radius and 44px height so they read as a matched
 * set.
 */
export default function MarketingHeader() {
  return (
    <header
      className="fixed top-0 inset-x-0 z-10 flex items-center justify-between px-5 sm:px-8 py-4 max-w-6xl w-full mx-auto"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <Wordmark height={42} textColor="var(--foreground)" />

      <nav
        aria-label="Primary"
        className="hidden md:flex items-center gap-8 text-[13px] font-medium absolute left-1/2 -translate-x-1/2"
      >
        <Link
          href="/features"
          className="transition-opacity hover:opacity-100"
          style={{ color: 'var(--muted)', opacity: 0.85 }}
        >
          Features
        </Link>
        <Link
          href="/pricing"
          className="transition-opacity hover:opacity-100"
          style={{ color: 'var(--muted)', opacity: 0.85 }}
        >
          Pricing
        </Link>
        <Link
          href="/about"
          className="transition-opacity hover:opacity-100"
          style={{ color: 'var(--muted)', opacity: 0.85 }}
        >
          About
        </Link>
      </nav>

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
  )
}
