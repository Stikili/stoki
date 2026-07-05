import type { Plan, Store } from '@/domain/entities/store'

/**
 * Trial length for every new signup, in days. Applies to first-store
 * creation via onboarding/saveStoreAction, and to any store that has
 * `grandfatheredUntil` set (the trial expiry timestamp).
 *
 * SVP-Product decision (2026-07-05): 90 days. Longer than industry
 * norm (14/30/60) but calibrated for the SA SMME audience where trust
 * is built over months, not days. Revisit downward if trial-to-paid
 * conversion at day 90 sits under 8%.
 */
export const TRIAL_DAYS = 90

/**
 * Resolve the effective plan for a store at request time.
 *
 * Two sources of paid-tier access:
 *   1. `store.plan` — the actual subscription tier the store is on.
 *   2. `store.grandfatheredUntil` — a future timestamp that grants
 *      Business-tier access until that time. This backs the 90-day
 *      trial every new signup gets (see TRIAL_DAYS above).
 *
 * When the trial window is active AND the stored plan is below Business,
 * the effective plan is Business — the user sees every self-serve
 * feature the product offers (Enterprise stays behind contact-sales).
 * If the stored plan is already Business or Enterprise, we don't
 * downgrade.
 *
 * Historic note: this column is called `grandfatheredUntil` because
 * it originally powered a paywall-rollout grace period for existing
 * accounts (90 days). It's now dual-purpose — the *mechanism* is the
 * same (elevate to a paid tier until timestamp X), only the *meaning*
 * has broadened from "grandfather" to "trial".
 */
export function effectivePlan(store: Pick<Store, 'plan' | 'grandfatheredUntil'>): Plan {
  if (isTrialActive(store)) {
    return planRank(store.plan) >= planRank('business') ? store.plan : 'business'
  }
  return store.plan
}

/** True when the trial window is currently active. */
export function isTrialActive(
  store: Pick<Store, 'grandfatheredUntil'>,
  now: Date = new Date(),
): boolean {
  if (!store.grandfatheredUntil) return false
  return new Date(store.grandfatheredUntil).getTime() > now.getTime()
}

/** Days remaining in the trial window, floored. 0 if not active. */
export function trialDaysRemaining(
  store: Pick<Store, 'grandfatheredUntil'>,
  now: Date = new Date(),
): number {
  if (!isTrialActive(store, now)) return 0
  const ms = new Date(store.grandfatheredUntil!).getTime() - now.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

// ── Legacy aliases (keep until callers are migrated) ────────────────────
// Old names retained so we can rename callers in a follow-up pass without
// breaking anything mid-flight.
/** @deprecated Use isTrialActive. */
export const isGrandfatherActive = isTrialActive
/** @deprecated Use trialDaysRemaining. */
export const grandfatherDaysRemaining = trialDaysRemaining

/** Numeric rank for ordering plans. Used for `planAtLeast`-style checks. */
export function planRank(plan: Plan): number {
  switch (plan) {
    case 'free':       return 0
    case 'pro':        return 1
    case 'business':   return 2
    case 'enterprise': return 3
  }
}

/** True when `actual` is at least as high as `required`. */
export function planAtLeast(actual: Plan, required: Plan): boolean {
  return planRank(actual) >= planRank(required)
}
