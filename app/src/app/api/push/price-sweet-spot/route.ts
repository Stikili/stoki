import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  authoriseCron, configureVapid,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'

/**
 * F-P-02 — Price Sweet Spot Detected.
 *
 * Daily cron. Looks for `price_changes` rows that are exactly 7+ days old
 * and unevaluated. For each, computes 7-day post-change qty against the
 * baseline 7-day-prior qty captured at the time of change. If post-change
 * velocity is >= 50% higher, marks the new price as a "sweet spot" and
 * pushes a confirmation per store.
 *
 * Requires migration 020 (price_changes table).
 *
 * Cron schedule: 0 8 * * * (08:00 UTC = 10:00 SAST).
 */

const VELOCITY_LIFT_THRESHOLD = 0.50 // +50%
const POST_WINDOW_DAYS = 7

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())
  if (!configureVapid()) return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 })

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  if (subs.length === 0) return NextResponse.json({ sent: 0 })

  // Pull every price-change row that hit its 7-day mark today and is
  // un-evaluated. We don't loop by store first — there may be very few
  // rows on any given day, so a flat scan is fine.
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - POST_WINDOW_DAYS)
  const { data: pending } = await supabase
    .from('price_changes')
    .select('id, store_id, product_id, old_price, new_price, changed_at, baseline_7d_qty')
    .is('evaluated_at', null)
    .lte('changed_at', sevenDaysAgo.toISOString())

  if (!pending || pending.length === 0) return NextResponse.json({ sent: 0, evaluated: 0 })

  let sent = 0
  let evaluated = 0
  // Group by store so we send at most one push per store per run even if
  // multiple SKUs hit their evaluation window today.
  const byStore = new Map<string, typeof pending>()
  for (const row of pending) {
    if (!byStore.has(row.store_id)) byStore.set(row.store_id, [])
    byStore.get(row.store_id)!.push(row)
  }

  for (const [storeId, rows] of byStore.entries()) {
    const sweetSpots: Array<{ name: string; new_price: number; lift: number }> = []
    for (const row of rows) {
      const windowStart = new Date(row.changed_at)
      const windowEnd = new Date(windowStart); windowEnd.setDate(windowEnd.getDate() + POST_WINDOW_DAYS)

      const { data: postSales } = await supabase
        .from('sales')
        .select('qty')
        .eq('store_id', storeId)
        .eq('product_id', row.product_id)
        .gte('recorded_at', windowStart.toISOString())
        .lte('recorded_at', windowEnd.toISOString())

      const postQty = (postSales ?? []).reduce((s, r) => s + Number(r.qty), 0)
      const baseline = Number(row.baseline_7d_qty ?? 0)
      const lift = baseline > 0 ? (postQty - baseline) / baseline : 0
      evaluated++

      // Stamp the row regardless of outcome so we don't re-evaluate.
      await supabase
        .from('price_changes')
        .update({
          post_change_7d_qty: postQty,
          velocity_lift_pct: lift,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      if (lift < VELOCITY_LIFT_THRESHOLD) continue

      // Look up the product name for the alert body.
      const { data: prod } = await supabase
        .from('products')
        .select('name')
        .eq('id', row.product_id)
        .maybeSingle()
      if (!prod?.name) continue

      sweetSpots.push({ name: prod.name as string, new_price: Number(row.new_price), lift })
    }

    if (sweetSpots.length === 0) continue

    const top = sweetSpots[0]
    const liftPct = Math.round(top.lift * 100)
    const others = sweetSpots.length - 1
    const body = `${top.name} at R${top.new_price.toFixed(2)} sold ${liftPct}% faster this week — that's a sweet spot${others > 0 ? `, plus ${others} more` : ''}. We'll remember it.`

    const result = await sendAndPersist(
      supabase, storeId, subs,
      { title: '📈 Price sweet spot detected', body, url: '/inventory' },
      'ai_insight',
      `Sweet spot: ${top.name} @ R${top.new_price.toFixed(2)} (+${liftPct}% velocity).`,
    )
    sent += result.sent
  }

  return NextResponse.json({ sent, evaluated })
}

export async function GET(req: Request) { return POST(req) }
