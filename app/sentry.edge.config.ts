/**
 * Sentry — edge runtime init (middleware + edge route handlers).
 *
 * Loaded from instrumentation.ts under NEXT_RUNTIME === 'edge'.
 * Edge runtime has restricted APIs (no fs, no most Node globals) so
 * we keep the config minimal — just capture errors, no performance
 * profiling.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? 'local',
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 0.05,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production',
})
