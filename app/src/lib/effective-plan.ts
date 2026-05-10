import type { Plan, Store } from '@/domain/entities/store'

/**
 * Resolve the effective plan for a store at request time.
 *
 * Two sources of paid-tier access:
 *   1. `store.plan` — the actual subscription tier the store is on.
 *   2. `store.grandfatheredUntil` — a future timestamp that grants Pro
 *      access until that time, used for:
 *        - existing accounts at the paywall rollout (90-day window)
 *        - new accounts at first-store creation (14-day free trial)
 *
 * When the grandfather window is active AND the stored plan is below Pro,
 * the effective plan is Pro. Otherwise the stored plan wins. (A user on
 * Business with an active grandfather still reads as Business, not Pro.)
 */
export function effectivePlan(store: Pick<Store, 'plan' | 'grandfatheredUntil'>): Plan {
  if (isGrandfatherActive(store)) {
    // Don't downgrade an already-paid plan. Only elevate free → pro.
    return planRank(store.plan) >= planRank('pro') ? store.plan : 'pro'
  }
  return store.plan
}

/** True when the grandfather window is currently active. */
export function isGrandfatherActive(
  store: Pick<Store, 'grandfatheredUntil'>,
  now: Date = new Date(),
): boolean {
  if (!store.grandfatheredUntil) return false
  return new Date(store.grandfatheredUntil).getTime() > now.getTime()
}

/** Days remaining in the grandfather window, floored. 0 if not active. */
export function grandfatherDaysRemaining(
  store: Pick<Store, 'grandfatheredUntil'>,
  now: Date = new Date(),
): number {
  if (!isGrandfatherActive(store, now)) return 0
  const ms = new Date(store.grandfatheredUntil!).getTime() - now.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

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
