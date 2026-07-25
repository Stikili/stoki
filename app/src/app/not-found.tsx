import Link from 'next/link'
import Wordmark from '@/components/Wordmark'

/**
 * Global 404. Next.js App Router picks up this file as the not-found
 * boundary for any unmatched route.
 *
 * Kept small + branded — no generic "The requested URL was not found
 * on this server" default. Offers useful next steps rather than a
 * dead end: sign in, browse features, back to home. Users who land
 * here from a stale bookmark or a broken external link get somewhere
 * useful in one tap.
 *
 * Not wrapped in the `(app)/` layout — this route lives outside the
 * authenticated shell, so it renders for anyone (including signed-out
 * visitors who mistyped a URL). Uses the same `.stoki-login` scope
 * class the landing / login pages use, so background orbs + display
 * fonts kick in without duplicating them here.
 */
export default function NotFound() {
  return (
    <div className="stoki-login min-h-screen flex flex-col items-center justify-center px-5 py-16 relative">
      {/* Background orbs — same emerald + blue accents as the landing
          so 404s feel like they belong to Stoki, not a stock error page. */}
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

      <div className="max-w-md w-full text-center">
        <div className="mb-8 inline-flex">
          <Wordmark height={42} textColor="var(--foreground)" />
        </div>

        <p
          className="text-xs font-semibold uppercase tracking-[0.18em] mb-3"
          style={{ color: 'var(--muted-dim)' }}
        >
          404
        </p>
        <h1
          className="text-[32px] sm:text-[44px] font-bold tracking-tight leading-[1.05] mb-4"
          style={{ color: 'var(--foreground)' }}
        >
          This page doesn&apos;t exist.
        </h1>
        <p
          className="text-[15px] sm:text-[16px] leading-relaxed mb-8"
          style={{ color: 'var(--muted)' }}
        >
          The link might be broken, the URL mistyped, or the page might have moved. Try one of these instead:
        </p>

        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <Link
            href="/"
            className="btn-gloss inline-flex items-center justify-center rounded-2xl px-6 py-3 font-semibold text-[15px] w-full"
          >
            <span className="relative z-10">Back to home</span>
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-semibold text-[14px] w-full"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--card-border)',
              color: 'var(--muted)',
            }}
          >
            See what Stoki does
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl px-6 py-3 font-semibold text-[14px] w-full"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--card-border)',
              color: 'var(--muted)',
            }}
          >
            Sign in to your account
          </Link>
        </div>

        <p className="mt-8 text-[11px]" style={{ color: 'var(--muted-dim)' }}>
          If you followed a link from another site and think this is a bug — email{' '}
          <a href="mailto:hello@stokiapp.com" className="underline" style={{ color: 'var(--muted)' }}>
            hello@stokiapp.com
          </a>
          {' '}and we&apos;ll fix the source.
        </p>
      </div>
    </div>
  )
}
