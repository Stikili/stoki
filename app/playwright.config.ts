import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — single-browser smoke testing for the golden path.
 *
 * Two tiers of tests, both in app/e2e/:
 *   1. Always-on smoke (landing + login render correctly). Catches "the deploy
 *      is broken / 500 errors / static build failed". Runs against any URL.
 *   2. Authenticated golden path (sign in → dashboard → record sale).
 *      Skips when TEST_USER_EMAIL + TEST_USER_PASSWORD aren't set, so CI
 *      without those secrets stays green.
 *
 * Base URL defaults to localhost:3000 (dev server). Override with
 * BASE_URL=https://stoki-staging.vercel.app for staging smoke tests.
 *
 * Local run:   npm run test:e2e
 * Headed:      npm run test:e2e -- --headed
 * Single test: npm run test:e2e -- e2e/golden-path.spec.ts
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // tests share auth state; serial keeps it simple
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No `webServer` here on purpose — the harness expects the dev server to
  // be running already (the user typically does `npm run dev` in another
  // terminal). Spawning a server inside CI later is one config knob away.
})
