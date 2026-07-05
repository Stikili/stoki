'use client'

/**
 * Root React error boundary — catches errors that bubble out of every
 * page and layout. Reports to Sentry so we hear about production
 * crashes without waiting for a user to complain, and shows a
 * friendly recovery UI instead of a blank screen.
 *
 * Required to be its own route file at app/global-error.tsx by Next.js;
 * this is the only place React can render when the root layout itself
 * has thrown.
 */
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import NextError from 'next/error'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ background: '#080f1a', color: '#e6eaf3', fontFamily: 'system-ui, sans-serif', margin: 0, padding: '48px 24px', minHeight: '100vh' }}>
        <div style={{ maxWidth: 440, margin: '10vh auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#7B8CA1', lineHeight: 1.5, marginBottom: 24 }}>
            We&apos;ve been notified and are looking into it. Try reloading — if it keeps happening, let us know at{' '}
            <a href="mailto:support@stokiapp.com?subject=Stoki%20error" style={{ color: '#00C896' }}>support@stokiapp.com</a>.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#00C896', color: '#080f1a', border: 'none', borderRadius: 14, padding: '12px 32px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Reload
          </button>
          {error.digest && (
            <p style={{ fontSize: 11, color: '#4A5878', marginTop: 24, fontFamily: 'monospace' }}>
              ref: {error.digest}
            </p>
          )}
        </div>
        {/* Fallback: bare Next error page in case the styled markup itself fails. */}
        <noscript>
          <NextError statusCode={0} />
        </noscript>
      </body>
    </html>
  )
}
