'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Wordmark from '@/components/Wordmark'

/**
 * Global 500 / uncaught-error boundary. Next.js App Router uses this
 * file as the top-level error boundary — any thrown error not caught
 * lower down surfaces here.
 *
 * Must be a client component (Next.js requirement) and receive
 * `error` + `reset` props.
 *
 * Sentry is wired via `instrumentation-client.ts` and captures the
 * error automatically before this component ever renders, so we don't
 * need to manually `Sentry.captureException(error)` here. Any custom
 * client-side context (breadcrumbs, tags) that we want to add would
 * go in a `useEffect(() => { Sentry.setContext(...) }, [error])`
 * block; not needed for the default case.
 *
 * The `reset` prop is Next.js's recovery hook — calling it re-mounts
 * the segment. Useful for transient errors (network flake); useless
 * for real bugs. We surface it as a "Try again" button but also
 * offer a home + support fallback for the common case where retry
 * won't help.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Log to browser console for local dev; production errors go to
  // Sentry automatically. The `digest` is Next.js's server-generated
  // fingerprint we can quote to support.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[stoki] global error boundary', error)
  }, [error])

  return (
    <div className="stoki-login min-h-screen flex flex-col items-center justify-center px-5 py-16 relative">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 45% at 50% 18%, rgba(239, 68, 68, 0.10) 0%, rgba(239, 68, 68, 0.02) 45%, transparent 75%)',
        }}
      />

      <div className="max-w-md w-full text-center">
        <div className="mb-8 inline-flex">
          <Wordmark height={42} textColor="var(--foreground)" />
        </div>

        <p
          className="text-xs font-semibold uppercase tracking-[0.18em] mb-3"
          style={{ color: '#ef4444' }}
        >
          Something broke
        </p>
        <h1
          className="text-[32px] sm:text-[44px] font-bold tracking-tight leading-[1.05] mb-4"
          style={{ color: 'var(--foreground)' }}
        >
          We hit an unexpected error.
        </h1>
        <p
          className="text-[15px] sm:text-[16px] leading-relaxed mb-6"
          style={{ color: 'var(--muted)' }}
        >
          The error has been logged and we&apos;ll look at it. Try again, or head back home and try a different route.
        </p>

        {/* Reference for support conversations — Next.js server digest
            or (fallback) client error name + first-message snippet. */}
        {(error.digest || error.name) && (
          <p
            className="text-[10.5px] font-mono mb-8 mx-auto px-3 py-1.5 rounded"
            style={{
              color: 'var(--muted-dim)',
              background: 'var(--surface)',
              border: '1px solid var(--card-border)',
              display: 'inline-block',
              maxWidth: '100%',
              wordBreak: 'break-all',
            }}
          >
            Reference: {error.digest ?? error.name}
          </p>
        )}

        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <button
            onClick={reset}
            className="btn-gloss inline-flex items-center justify-center rounded-2xl px-6 py-3 font-semibold text-[15px] w-full"
          >
            <span className="relative z-10">Try again</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-semibold text-[14px] w-full"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--card-border)',
              color: 'var(--muted)',
            }}
          >
            Back to home
          </Link>
        </div>

        <p className="mt-8 text-[11px]" style={{ color: 'var(--muted-dim)' }}>
          Still stuck? Email{' '}
          <a href="mailto:support@stokiapp.com" className="underline" style={{ color: 'var(--muted)' }}>
            support@stokiapp.com
          </a>
          {error.digest ? ` with the reference above (${error.digest}).` : ' with a screenshot.'}
        </p>
      </div>
    </div>
  )
}
