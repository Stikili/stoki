import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

// __dirname here = .../stoki/app. Going one level up lands on the stoki repo
// root, which has its own package.json + lockfile (the npm workspace root).
// Setting both keys silences the auto-detection warnings on whichever bundler
// is in use (Turbopack vs webpack) and stops Next from picking up the unrelated
// lockfile in the user's home directory.
const repoRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,

  /**
   * URL rewrites — transparent server-side rewrites (NOT redirects).
   * The URL bar stays on the rewritten path; the backend renders the
   * destination. Different from `redirects()` which flips the URL.
   *
   * /register → /login?intent=register — gives us a canonical /register
   * URL for backlinks, marketing CTAs, Vercel Analytics granularity,
   * and users who type it in the URL bar. The register flow renders
   * from the existing login page but the browser bar stays "/register"
   * throughout the sign-up, which is cleaner UX than the previous
   * "click Sign up free → land on /login" jarring switch.
   */
  async rewrites() {
    return [
      { source: '/register', destination: '/login?intent=register' },
    ]
  },
};

/**
 * Sentry Webpack plugin options — uploads source maps for readable
 * stack traces in production. Requires SENTRY_ORG + SENTRY_PROJECT +
 * SENTRY_AUTH_TOKEN env vars set in the Vercel build environment
 * (auth token: sentry.io → Settings → Auth Tokens → project:releases).
 * All three are optional at build time — missing values skip upload
 * silently so local `next build` still succeeds without Sentry creds.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Only upload source maps in real prod builds — skip preview + local.
  silent: process.env.VERCEL_ENV !== 'production',
  // Tree-shakes Sentry's dev-only logger from prod bundles, saves ~20KB.
  disableLogger: true,
  // Route Sentry's ingress through /monitoring to avoid ad-blockers
  // silently dropping error reports (~30% of users block *.sentry.io).
  tunnelRoute: '/monitoring',
});
