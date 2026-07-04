/**
 * Next 16 instrumentation hook — runs once when the server starts. Used here
 * for production-safety guardrails that should refuse to boot rather than
 * silently misconfigure.
 *
 * Current checks:
 *   1. NODE_TLS_REJECT_UNAUTHORIZED=0 on a real Vercel production deploy
 *      → throw. Disabling TLS verification in prod means any MITM (incl.
 *      malicious proxy) is silently trusted. This env var is necessary
 *      for local dev against Norton VPN's HTTPS-scanning interception
 *      (see memory reference_local_env_tls), but must NEVER reach a
 *      real deploy. One copy-paste error from a real incident; this
 *      guard makes it a fast-fail at boot instead.
 *
 * The check uses VERCEL_ENV, not NODE_ENV — `next start` locally always
 * sets NODE_ENV=production (it's the only value next start understands),
 * so gating on NODE_ENV would block legitimate local prod-mode smoke
 * testing. VERCEL_ENV is only set on Vercel-hosted runs; `=== 'production'`
 * specifically means "this is the live deploy", not "preview" or "dev".
 */
export async function register(): Promise<void> {
  // 1) TLS-bypass guardrail (see above).
  if (process.env.VERCEL_ENV === 'production') {
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      throw new Error(
        '[stoki-safety] NODE_TLS_REJECT_UNAUTHORIZED=0 set in a Vercel ' +
        'production deploy. Refusing to boot — this disables TLS certificate ' +
        'verification for every outbound HTTPS call. If you reached this in ' +
        'error, unset the env var in Vercel Project Settings; if you reached ' +
        'this on purpose, you almost certainly do not want what you think you want.',
      )
    }
  }

  // 2) Sentry — load the right runtime config. Sentry itself silently
  //    no-ops if NEXT_PUBLIC_SENTRY_DSN is unset, so this is safe on
  //    local dev where the env var doesn't exist.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Next 16 request-error hook — fires whenever an App Router route
 * throws during rendering / server actions / route handlers. Sentry's
 * captureRequestError enriches the event with request context
 * (route, method, headers) before shipping to the Sentry backend.
 * Safe no-op if Sentry isn't initialised.
 */
export { captureRequestError as onRequestError } from '@sentry/nextjs'
