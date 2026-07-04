/**
 * Sentry — server-side (Node runtime) init.
 *
 * Loaded from instrumentation.ts under NEXT_RUNTIME === 'nodejs'.
 * Same DSN as the browser + edge configs, but with server-specific
 * options (higher traces sample, no replay).
 *
 * NEXT_PUBLIC_SENTRY_DSN is intentionally NEXT_PUBLIC — the DSN is
 * write-only telemetry credentials and safe to ship in the client
 * bundle. If unset, Sentry silently no-ops (fine for local dev).
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tag lets us filter production vs preview vs local
  // in the Sentry UI. VERCEL_ENV maps to production / preview / development.
  environment: process.env.VERCEL_ENV ?? 'local',

  // Release tag ties each error to the exact deploy that produced it.
  // VERCEL_GIT_COMMIT_SHA is auto-set on every Vercel deploy.
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Performance sampling — start low to stay within free-tier quota
  // (~5k events/month). Bump to 0.2-0.5 once traffic patterns are known
  // and you want richer traces.
  tracesSampleRate: 0.1,

  // Keep the noise floor low: skip Vercel edge network errors and known
  // client-abort patterns that aren't actionable.
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'AbortError',
    'Non-Error promise rejection captured',
  ],

  // Don't send events from local dev unless the DSN is explicitly set.
  // Prevents accidentally burning the quota during `next dev`.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production',
})
