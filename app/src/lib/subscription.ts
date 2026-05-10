import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan, SubscriptionStatus } from '@/domain/entities/store'

/**
 * Subscription state machine.
 *
 * Drives the `stores.plan` + `stores.subscription_*` columns through their
 * lifecycle in response to payment-provider webhooks (or test events on the
 * generic /api/billing/webhook route while no provider is wired in yet).
 *
 * Design choices:
 *
 *   - Stored plan IS the source of truth for entitlement. The state machine
 *     mutates plan as it transitions, so `effectivePlan()` in
 *     lib/effective-plan.ts doesn't need to know about subscription state.
 *
 *   - `cancelled` keeps `plan` at the paid tier until `subscription_active_until`
 *     so the user has the access they already paid for. The retry cron flips
 *     to `expired` + `plan='free'` once that timestamp is in the past.
 *
 *   - `past_due` keeps `plan` at the paid tier as a 3-retry grace window.
 *     After three failed retries (one daily cron run each), expire.
 *
 *   - All transitions log a row in `subscription_events` for the audit trail
 *     AND for the conversion funnel (which uses the same table).
 *
 * Every helper accepts an admin Supabase client because the webhook caller
 * is the platform, not the user.
 */

export const RETRY_GRACE_DAYS = 3

interface RecordPaymentSuccessInput {
  storeId: string
  plan: Plan
  periodDays: number
  provider?: string
  providerRef?: string
  /** When set, the event is recorded as a renewal rather than a creation.
   *  Defaults to "first-success-is-creation, rest are renewals" based on
   *  whether the store currently has subscription_active_until set. */
  forceRenewal?: boolean
}

/**
 * Successful charge → set plan, push the active-until window out, reset retry
 * counter, and log either subscription_created (first time) or _renewed.
 */
export async function recordPaymentSuccess(
  admin: SupabaseClient,
  input: RecordPaymentSuccessInput,
): Promise<void> {
  const now = new Date()
  const activeUntil = new Date(now.getTime() + input.periodDays * 86_400_000).toISOString()

  const { data: existing } = await admin
    .from('stores')
    .select('subscription_active_until, subscription_status')
    .eq('id', input.storeId)
    .maybeSingle()
  const isRenewal = input.forceRenewal ?? Boolean(existing?.subscription_active_until)

  await admin.from('stores').update({
    plan: input.plan,
    subscription_status: 'active' satisfies SubscriptionStatus,
    subscription_active_until: activeUntil,
    subscription_provider: input.provider ?? null,
    subscription_provider_ref: input.providerRef ?? null,
    subscription_last_charge_at: now.toISOString(),
    subscription_retry_count: 0,
  }).eq('id', input.storeId)

  await admin.from('subscription_events').insert({
    store_id: input.storeId,
    event_type: isRenewal ? 'subscription_renewed' : 'subscription_created',
    metadata: {
      plan: input.plan,
      period_days: input.periodDays,
      provider: input.provider ?? null,
      provider_ref: input.providerRef ?? null,
    },
  })
}

/**
 * Failed charge → flip status to past_due, increment retry counter. The
 * `plan` column stays at the paid tier so the user keeps access during
 * the grace window — only the daily retry cron decides when to expire.
 */
export async function recordPaymentFailure(
  admin: SupabaseClient,
  storeId: string,
  reason?: string,
): Promise<void> {
  const { data: store } = await admin
    .from('stores')
    .select('subscription_retry_count')
    .eq('id', storeId)
    .maybeSingle()
  const retries = (Number(store?.subscription_retry_count ?? 0)) + 1

  await admin.from('stores').update({
    subscription_status: 'past_due' satisfies SubscriptionStatus,
    subscription_retry_count: retries,
  }).eq('id', storeId)

  await admin.from('subscription_events').insert({
    store_id: storeId,
    event_type: 'subscription_failed',
    metadata: { reason: reason ?? null, retries },
  })
}

/**
 * User clicked Cancel. Mark status, but keep `plan` and `active_until` as-is
 * so they get the period they already paid for. The retry cron will expire
 * them once `active_until` is in the past.
 */
export async function recordCancellation(
  admin: SupabaseClient,
  storeId: string,
  userId?: string,
): Promise<void> {
  await admin.from('stores').update({
    subscription_status: 'cancelled' satisfies SubscriptionStatus,
  }).eq('id', storeId)

  await admin.from('subscription_events').insert({
    store_id: storeId,
    event_type: 'subscription_cancelled',
    user_id: userId ?? null,
    metadata: {},
  })
}

/**
 * Final transition — store is fully expired. Plan drops to free. Called by
 * the retry cron when retries are exhausted OR when a cancelled subscription's
 * active-until timestamp has passed.
 */
export async function recordExpiry(
  admin: SupabaseClient,
  storeId: string,
  reason: 'retries_exhausted' | 'cancelled_lapsed' | 'manual',
): Promise<void> {
  await admin.from('stores').update({
    plan: 'free' satisfies Plan,
    subscription_status: 'expired' satisfies SubscriptionStatus,
    subscription_retry_count: 0,
  }).eq('id', storeId)

  await admin.from('subscription_events').insert({
    store_id: storeId,
    event_type: 'subscription_expired',
    metadata: { reason },
  })
}

/** Sweep helpers used by the daily retry cron. */
export interface RetrySweepResult {
  retried: string[]
  expiredFromRetries: string[]
  expiredFromCancellation: string[]
}

/**
 * Find stores that need attention from the retry cron. Returns three lists:
 *
 *   - retried:                  `past_due` rows that still have retry budget
 *                               (caller will trigger a fresh charge attempt
 *                               via the payment provider; when that lands
 *                               we get back either payment_succeeded or
 *                               payment_failed via webhook).
 *
 *   - expiredFromRetries:       `past_due` rows that have hit RETRY_GRACE_DAYS
 *                               failed attempts — fully expired.
 *
 *   - expiredFromCancellation:  `cancelled` rows whose paid-through window
 *                               has elapsed — they had their period, now done.
 */
export async function findStoresNeedingAttention(
  admin: SupabaseClient,
): Promise<RetrySweepResult> {
  const nowIso = new Date().toISOString()

  // past_due rows we want to retry: those whose last charge was >= 24h ago.
  // Anything more recent than 24h is already in a fresh-attempt window we
  // don't want to double-charge.
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
  const { data: pastDue } = await admin
    .from('stores')
    .select('id, subscription_retry_count, subscription_last_charge_at')
    .eq('subscription_status', 'past_due')
    .or(`subscription_last_charge_at.is.null,subscription_last_charge_at.lte.${dayAgo}`)

  const retried: string[] = []
  const expiredFromRetries: string[] = []
  for (const row of pastDue ?? []) {
    const n = Number((row as { subscription_retry_count?: number }).subscription_retry_count ?? 0)
    const id = (row as { id: string }).id
    if (n >= RETRY_GRACE_DAYS) expiredFromRetries.push(id)
    else retried.push(id)
  }

  // cancelled rows whose paid-through window has lapsed.
  const { data: lapsedCancellations } = await admin
    .from('stores')
    .select('id')
    .eq('subscription_status', 'cancelled')
    .not('subscription_active_until', 'is', null)
    .lte('subscription_active_until', nowIso)

  const expiredFromCancellation = (lapsedCancellations ?? []).map(s => (s as { id: string }).id)

  return { retried, expiredFromRetries, expiredFromCancellation }
}
