'use server'

import { getServerData } from '@/lib/getServerData'
import { createAdminClient } from '@/infrastructure/supabase/admin'

/**
 * In-product analytics — currently scoped to the paywall conversion funnel.
 *
 * Events ride on the same `subscription_events` table the billing state
 * machine uses, so a join lets us answer questions like "of the users who
 * saw the F-A-09 paywall this week, how many ended up on Pro?" without
 * spinning up a separate analytics warehouse.
 *
 * Fire-and-forget: this function never throws or blocks. Analytics writes
 * are best-effort by design — losing one is fine, blocking UX never is.
 */

export type AnalyticsEventType =
  | 'paywall_viewed'
  | 'paywall_clicked'
  | 'paywall_dismissed'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_failed'

export async function recordAnalyticsEventAction(
  eventType: AnalyticsEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { user, store } = await getServerData()
    // Use the admin client to bypass per-row RLS — analytics writes are
    // platform-level audit, not user data, and we don't want a stale
    // session token to silently drop an event on the floor.
    const admin = createAdminClient()
    await admin.from('subscription_events').insert({
      store_id: store.id,
      event_type: eventType,
      user_id: user.id,
      metadata: metadata ?? {},
    })
  } catch {
    // Swallow everything — analytics never blocks. Worth logging in
    // production observability later; for now silent failure is fine.
  }
}
