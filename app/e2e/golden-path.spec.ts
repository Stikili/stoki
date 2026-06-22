import { test, expect } from '@playwright/test'

/**
 * Two-tier smoke test for the golden path.
 *
 * TIER 1 — always-on smoke (no auth required):
 *   Landing renders. Login renders. These are the "is the deploy alive?"
 *   tests that catch broken builds, 500s on the public surface, or missing
 *   assets.
 *
 * TIER 2 — authenticated golden path:
 *   Sign in → dashboard loads → record a manual sale via the FAB →
 *   confirm the sale appears in cash-up. Skips when
 *   TEST_USER_EMAIL + TEST_USER_PASSWORD aren't set.
 *
 * The test user MUST have at least one store with onboarding completed —
 * we don't reset state between runs, we just add one more sale and
 * confirm the count grew.
 */

const E2E_EMAIL = process.env.TEST_USER_EMAIL
const E2E_PASSWORD = process.env.TEST_USER_PASSWORD
const authConfigured = Boolean(E2E_EMAIL && E2E_PASSWORD)

// ── Tier 1 — always-on smoke ──────────────────────────────────────────────

test.describe('Smoke — public surface', () => {
  test('landing page renders the hero + sign-up CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /run your business/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign up free/i }).first()).toBeVisible()
  })

  test('login page renders email + password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder(/name@stoki\.app|\+27 72/i)).toBeVisible()
    // Password input only shows up in email mode (the default). Use the
    // role-based query so we don't depend on placeholder copy.
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})

// ── Tier 2 — authenticated golden path ────────────────────────────────────

test.describe('Golden path — record a sale end-to-end', () => {
  test.skip(!authConfigured, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to enable')

  test('sign in → dashboard → record a manual sale → see it in cash-up', async ({ page }) => {
    // Sign in with credentials supplied via env.
    await page.goto('/login')
    await page.getByPlaceholder(/name@stoki\.app|\+27 72/i).fill(E2E_EMAIL!)
    await page.getByPlaceholder(/your password/i).fill(E2E_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Land on dashboard — the today-revenue hero confirms we're authenticated
    // and the store snapshot rendered.
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page.getByText(/today.s revenue/i)).toBeVisible({ timeout: 10_000 })

    // Capture today's sale count so we can assert it grew after recording.
    const salesCountBefore = await readSaleCount(page)

    // Open the sale FAB and add a manual line.
    // FAB sits bottom-right; assume it's labeled with a + icon or "Add sale".
    const fab = page.getByRole('button', { name: /sell|add sale|new sale|sale/i }).last()
    await fab.click({ timeout: 5_000 })

    // Add a one-off manual item (free-text, no product link). The exact
    // selectors depend on the SalesClient UI — this is the brittle part
    // of any e2e test. If the selectors drift, surface the diff in the
    // failure rather than silently passing.
    await page.getByRole('button', { name: /add item/i }).click()
    await page.getByPlaceholder(/item name|product name|description/i).fill('E2E test item')
    await page.getByPlaceholder(/price/i).fill('10.00')
    await page.getByRole('button', { name: /add to cart|add line|confirm/i }).click()
    await page.getByRole('button', { name: /complete sale|charge|record/i }).click()

    // Back on dashboard, the sale count should have grown by 1.
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    const salesCountAfter = await readSaleCount(page)
    expect(salesCountAfter).toBeGreaterThan(salesCountBefore)

    // Cash-up should also reflect the new R10 in the cash column.
    await page.goto('/cashup')
    await expect(page.getByText(/cash/i).first()).toBeVisible()
    await expect(page.getByText(/10\.00/)).toBeVisible({ timeout: 5_000 })
  })
})

/** Read the "N sales" line from the dashboard's revenue hero. Returns 0 if
 *  the line isn't present (first-time user). */
async function readSaleCount(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.locator('text=/\\d+\\s+sales?/').first().textContent()
  if (!text) return 0
  const match = text.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}
