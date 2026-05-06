import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AlertType } from '@/domain/entities/alert'

/**
 * Shared utilities for push-notification routes.
 *
 * Every auto-pushed feature needs the same scaffolding:
 *   - VAPID setup
 *   - subscriptions list per store
 *   - send + clean expired
 *   - persist an in-app alert row so the inbox stays in sync
 *
 * Centralised so each new feature is ~30 lines instead of ~80.
 */

export interface PushPayload {
  title: string
  body: string
  /** Click destination — typically a deep link into the app. */
  url: string
}

export interface PushSubscriptionRow {
  id: string
  store_id: string
  endpoint: string
  p256dh: string
  auth: string
}

let vapidConfigured = false

/** Lazily call once per process. webpush.setVapidDetails throws if creds are
 *  malformed or missing; we surface that as an explicit error rather than
 *  letting individual routes fail mysteriously. */
export function configureVapid(): boolean {
  if (vapidConfigured) return true
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:hello@stoki.app'
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  vapidConfigured = true
  return true
}

/** Standard cron / bearer auth — extracted from the existing summary routes. */
export function authoriseCron(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-vercel-cron')
  if (cronHeader) return true
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  if (authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) return true
  return false
}

/** Send to one subscription; on failure (404/410), delete the row so we
 *  don't keep retrying expired browsers. Returns true on success. */
export async function sendOne(
  supabase: SupabaseClient,
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    )
    return true
  } catch {
    await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    return false
  }
}

/** Convenience: send the same payload to every subscription for `storeId`,
 *  AND persist an alert row so the in-app inbox shows the same content even
 *  if the user missed/dismissed the push. */
export async function sendAndPersist(
  supabase: SupabaseClient,
  storeId: string,
  subs: PushSubscriptionRow[],
  payload: PushPayload,
  alertType: AlertType,
  alertMessage: string,
): Promise<{ sent: number }> {
  let sent = 0
  const storeSubs = subs.filter(s => s.store_id === storeId)
  for (const s of storeSubs) {
    if (await sendOne(supabase, s, payload)) sent++
  }
  // Persist regardless of how many subs received the push — the inbox is the
  // canonical record. If insert fails (e.g. RLS / schema mismatch), don't
  // block the rest of the loop.
  try {
    await supabase.from('alerts').insert({
      store_id: storeId,
      type: alertType,
      message: alertMessage,
    })
  } catch { /* non-fatal */ }
  return { sent }
}

/** Pull all subscriptions in one query. Cron loops over this list; the
 *  per-store iteration is then in-memory. */
export async function fetchAllSubscriptions(
  supabase: SupabaseClient,
): Promise<PushSubscriptionRow[]> {
  const { data } = await supabase.from('push_subscriptions').select('*')
  return (data as PushSubscriptionRow[] | null) ?? []
}

/** Distinct store_ids that have at least one push subscription — i.e. the
 *  shops we should evaluate. Avoids paying for compute on shops with no way
 *  to receive a push anyway. */
export function distinctStoreIds(subs: PushSubscriptionRow[]): string[] {
  return [...new Set(subs.map(s => s.store_id))]
}
