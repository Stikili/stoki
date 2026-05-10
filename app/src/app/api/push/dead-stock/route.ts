import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  alreadyAlertedRecently, authoriseCron, configureVapid, fetchAllStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'

const DEDUP_WINDOW_HOURS = 168 // weekly digest — match the cron cadence
const FEATURE_MARKER = '[F-P-03]'

/**
 * F-P-03 — Dead Stock Alert.
 *
 * Weekly cron, Monday morning. Finds SKUs with zero sales in the last 21
 * days that still have on-hand stock, sums the working capital tied up
 * (qty × cost), and pushes a digest per store.
 *
 * Cron schedule: 0 7 * * 1 (07:00 UTC Mondays = 09:00 SAST Mondays).
 */

const DEAD_STOCK_WINDOW_DAYS = 21

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())
  configureVapid()

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  const storeIds = await fetchAllStoreIds(supabase)
  if (storeIds.length === 0) return NextResponse.json({ sent: 0 })

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DEAD_STOCK_WINDOW_DAYS)
  const cutoffIso = cutoff.toISOString()

  let sent = 0
  for (const storeId of storeIds) {
    // All in-stock products for the store. Filter dead stock in JS — Supabase
    // doesn't have a "left-anti-join" idiom that's cleaner than two queries.
    const { data: products } = await supabase
      .from('products')
      .select('id, name, qty, cost')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .gt('qty', 0)
    if (!products || products.length === 0) continue

    // Sales in the window for these products.
    const { data: recentSales } = await supabase
      .from('sales')
      .select('product_id')
      .eq('store_id', storeId)
      .gte('recorded_at', cutoffIso)

    const soldRecently = new Set((recentSales ?? []).map(s => s.product_id))
    const dead = products.filter(p => !soldRecently.has(p.id))
    if (dead.length === 0) continue
    if (await alreadyAlertedRecently(supabase, storeId, FEATURE_MARKER, DEDUP_WINDOW_HOURS)) continue

    const tiedUp = dead.reduce((sum, p) => sum + Number(p.qty) * Number(p.cost), 0)
    const skuWord = dead.length === 1 ? 'item hasn\'t' : 'items haven\'t'
    const body = `${dead.length} ${skuWord} sold in 3 weeks. R${tiedUp.toFixed(0)} is stuck. Tap to discount, bundle, or return.`

    const result = await sendAndPersist(
      supabase, storeId, subs,
      { title: '🛑 Dead stock — money tied up', body, url: '/inventory?filter=dead' },
      'ai_insight',
      `${FEATURE_MARKER} Dead stock: ${dead.length} item${dead.length === 1 ? '' : 's'} unsold in ${DEAD_STOCK_WINDOW_DAYS}d, R${tiedUp.toFixed(0)} tied up.`,
    )
    sent += result.sent
  }

  return NextResponse.json({ sent })
}

export async function GET(req: Request) { return POST(req) }
