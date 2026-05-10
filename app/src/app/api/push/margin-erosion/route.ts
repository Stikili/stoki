import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  alreadyAlertedRecently, authoriseCron, configureVapid, fetchAllStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'

/**
 * F-P-01 — Margin Erosion Alert.
 *
 * Daily cron. For every store, find products whose current gross margin is
 * below MARGIN_THRESHOLD. Push one notification per store covering the worst
 * offender. The full list is available in-app via the alert deep link.
 *
 * Cron schedule: 0 7 * * * (07:00 UTC = 09:00 SAST, post stock-capture window).
 */

const MARGIN_THRESHOLD = 0.10 // 10%
const DEDUP_WINDOW_HOURS = 48
const FEATURE_MARKER = '[F-P-01]'

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())
  // VAPID is best-effort — when it isn't configured, sendOne silently no-ops
  // and the route still persists in-app alerts. Push fires only for users
  // who've opted in.
  configureVapid()

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  const storeIds = await fetchAllStoreIds(supabase)
  if (storeIds.length === 0) return NextResponse.json({ sent: 0, persisted: 0 })

  let sent = 0
  let evaluated = 0
  for (const storeId of storeIds) {
    evaluated++
    // Only need rows where price > 0 (else margin is meaningless) and cost > 0
    // (else we don't know the actual margin). Keep the column list narrow.
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, cost, qty')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .gt('price', 0)
      .gt('cost', 0)

    const eroded = (products ?? [])
      .map(p => ({ ...p, margin: 1 - Number(p.cost) / Number(p.price) }))
      .filter(p => p.margin < MARGIN_THRESHOLD && Number(p.qty) > 0)
      .sort((a, b) => a.margin - b.margin)

    if (eroded.length === 0) continue
    if (await alreadyAlertedRecently(supabase, storeId, FEATURE_MARKER, DEDUP_WINDOW_HOURS)) continue

    const worst = eroded[0]
    const marginPct = Math.round(worst.margin * 100)
    const others = eroded.length - 1
    const body = `${worst.name} margin is ${marginPct}%${others > 0 ? ` · ${others} more product${others === 1 ? '' : 's'} below 10%` : ''}. Tap to review.`

    const result = await sendAndPersist(
      supabase, storeId, subs,
      { title: '⚠️ Margin erosion detected', body, url: '/inventory?filter=low-margin' },
      'ai_insight',
      `${FEATURE_MARKER} Margin erosion: ${worst.name} at ${marginPct}%${others > 0 ? ` (and ${others} more)` : ''}`,
    )
    sent += result.sent
  }

  return NextResponse.json({ sent, evaluated })
}

export async function GET(req: Request) { return POST(req) }
