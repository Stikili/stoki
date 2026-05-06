import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  authoriseCron, configureVapid, distinctStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'

/**
 * F-P-04 — Stockout Cost Estimate.
 *
 * Hourly cron. Detects products that hit zero stock since the last run and
 * sends a "you're losing R{X}/day" notification per store. Uses the trailing
 * 30-day average daily revenue per SKU as the loss baseline.
 *
 * 48-hour follow-up: same evaluator runs hourly, so a SKU that's been at 0
 * stock for 48 hours and hasn't been restocked gets a second urgency push.
 *
 * Cron schedule: 0 * * * * (top of every hour).
 */

const ESTIMATE_WINDOW_DAYS = 30
const FOLLOWUP_HOURS = 48
/** Don't pester for tiny SKUs — only push when the daily-revenue estimate
 *  is above this. R20/day = "yeah you'd notice". */
const MIN_DAILY_REVENUE = 20

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())
  if (!configureVapid()) return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 })

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  if (subs.length === 0) return NextResponse.json({ sent: 0 })

  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - ESTIMATE_WINDOW_DAYS)

  let sent = 0
  for (const storeId of distinctStoreIds(subs)) {
    // Products at zero. Note: "just-went-to-zero" detection lives implicitly
    // in alert dedup — we fire one alert per stockout episode, then a 48h
    // follow-up. Dedup uses the existing alerts table: if there's already an
    // unread `out_of_stock` alert for this product within the last 48h, we
    // skip; if it's older than 48h and stock is still zero, that's the
    // follow-up trigger.
    const { data: outOfStock } = await supabase
      .from('products')
      .select('id, name, price, cost')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .eq('qty', 0)
    if (!outOfStock || outOfStock.length === 0) continue

    for (const product of outOfStock) {
      // Trailing 30-day revenue for this SKU.
      const { data: sales } = await supabase
        .from('sales')
        .select('qty, price_at_sale')
        .eq('store_id', storeId)
        .eq('product_id', product.id)
        .gte('recorded_at', windowStart.toISOString())
        .lte('recorded_at', now.toISOString())

      const totalRevenue = (sales ?? []).reduce(
        (s, r) => s + Number(r.qty) * Number(r.price_at_sale), 0)
      const dailyRevenue = totalRevenue / ESTIMATE_WINDOW_DAYS
      if (dailyRevenue < MIN_DAILY_REVENUE) continue

      // Dedup: was there already a stockout alert for this exact product in
      // the last 48h? Match on message-substring since alerts.message is the
      // canonical store. (We don't have a separate alerts.product_id column.)
      const dedupCutoff = new Date(now)
      dedupCutoff.setHours(dedupCutoff.getHours() - FOLLOWUP_HOURS)
      const { data: recentAlerts } = await supabase
        .from('alerts')
        .select('id, created_at')
        .eq('store_id', storeId)
        .eq('type', 'out_of_stock')
        .ilike('message', `%${product.name}%`)
        .gte('created_at', dedupCutoff.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
      if ((recentAlerts ?? []).length > 0) continue

      const dailyRand = Math.round(dailyRevenue)
      const twoDayLoss = Math.round(dailyRevenue * 2)
      const body = `${product.name} hit zero. Based on the last 30 days you'd lose ~R${dailyRand}/day (~R${twoDayLoss} over 48h). Reorder now?`

      const result = await sendAndPersist(
        supabase, storeId, subs,
        { title: '😬 Stockout — you\'re losing money', body, url: '/inventory?filter=out' },
        'out_of_stock',
        `${product.name} is out of stock (~R${dailyRand}/day at risk).`,
      )
      sent += result.sent
    }
  }

  return NextResponse.json({ sent })
}

export async function GET(req: Request) { return POST(req) }
