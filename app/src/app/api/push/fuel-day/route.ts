import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  alreadyAlertedRecently, authoriseCron, configureVapid, fetchAllStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'

const DEDUP_WINDOW_HOURS = 48
const FEATURE_MARKER = '[F-P-10]'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'
import { isFirstWednesday } from '@/lib/sa-calendar'

/**
 * F-P-10 — Fuel Price Day Reminder.
 *
 * Daily cron. Fires only on the first Wednesday of each calendar month —
 * SA's official fuel-price adjustment day. Reminds owners to chase updated
 * delivery quotes before placing big orders, since supplier surcharges
 * typically follow with a 1–2 week lag.
 *
 * Cron schedule: 0 7 * * 3 (Wednesday 09:00 SAST). The route also self-
 * checks `isFirstWednesday` so an over-eager schedule doesn't fire on the
 * 2nd or 3rd Wednesday.
 */

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())
  if (!isFirstWednesday(new Date())) return NextResponse.json({ skipped: true, reason: 'not_first_wednesday' })
  configureVapid()

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  const storeIds = await fetchAllStoreIds(supabase)
  if (storeIds.length === 0) return NextResponse.json({ sent: 0 })

  const body = "Fuel prices changed today. Delivery costs from suppliers usually follow in 1–2 weeks. Get fresh quotes before placing big orders."

  let sent = 0
  for (const storeId of storeIds) {
    if (await alreadyAlertedRecently(supabase, storeId, FEATURE_MARKER, DEDUP_WINDOW_HOURS)) continue
    const result = await sendAndPersist(
      supabase, storeId, subs,
      { title: '⛽ Fuel price day', body, url: '/suppliers' },
      'ai_insight',
      `${FEATURE_MARKER} Fuel adjustment day. ${body}`,
    )
    sent += result.sent
  }

  return NextResponse.json({ sent })
}

export async function GET(req: Request) { return POST(req) }
