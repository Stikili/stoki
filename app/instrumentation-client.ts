/**
 * Next 16 instrumentation-client — runs once on the browser side.
 *
 * Boots Sentry for the browser, capturing:
 *   - Unhandled exceptions in React tree (paired with global-error.tsx)
 *   - Unhandled promise rejections
 *   - Console errors (opt-in)
 *   - Router navigations (breadcrumbs)
 *
 * Session Replay is intentionally off — spaza-owner audience is on
 * expensive prepaid data, and Replay ships ~50KB extra to every user.
 * Turn on later if a specific debugging case needs it.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'local',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Browser trace sampling — 10% is enough to spot patterns without
  // blowing the free-tier event budget.
  tracesSampleRate: 0.1,

  // Router-transaction integration ships built-in with @sentry/nextjs
  // — no explicit integrations array needed.

  ignoreErrors: [
    // Very common browser noise that isn't actionable
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    // Aborted fetches (user navigated away mid-request) fire a lot on mobile
    'AbortError',
    'The user aborted a request',
    // Service-worker install races — not fixable, not the user's problem
    'Failed to fetch',
  ],

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production',
})

// Next 16 requires the client instrumentation to export this hook for
// router-transition tracing. Sentry provides it out of the box.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
