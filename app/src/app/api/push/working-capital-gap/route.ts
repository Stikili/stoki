import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  alreadyAlertedRecently, authoriseCron, configureVapid, fetchAllStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'

/**
 * F-P-07 — Working Capital Gap Alert.
 *
 * Daily cron. Fires within 4 days of month-end (the heaviest restock
 * window). For each store with a logged `cash_balance`, compares it to a
 * projected optimal-restock value (sum of cost × top-selling qty over the
 * trailing 60 days, scaled to a typical month-end refill). When the cash
 * balance is below the optimal restock, pushes a notice + suggests the
 * priority-ranked subset that fits the budget.
 *
 * Without `cash_balance` set, the store is silently skipped — there's
 * nothing to compare against.
 *
 * Requires migration 020 (stores.cash_balance).
 *
 * Cron schedule: 0 7 * * * (07:00 UTC daily; route guards on month-end window).
 */

const MONTH_END_LEAD_DAYS = 4
const TRAILING_DAYS = 60
const DEDUP_WINDOW_HOURS = 48
const FEATURE_MARKER = '[F-P-07]'

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())
  configureVapid()

  const now = new Date()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysToMonthEnd = Math.floor((monthEnd.getTime() - now.getTime()) / 86_400_000)
  if (daysToMonthEnd > MONTH_END_LEAD_DAYS) {
    return NextResponse.json({ skipped: true, reason: 'not_within_window', daysToMonthEnd })
  }

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  const storeIds = await fetchAllStoreIds(supabase)
  if (storeIds.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const storeId of storeIds) {
    const { data: store } = await supabase
      .from('stores')
      .select('cash_balance, cash_balance_updated_at')
      .eq('id', storeId)
      .maybeSingle()
    if (!store?.cash_balance) continue
    const cashBalance = Number(store.cash_balance)
    if (cashBalance <= 0) continue

    // Optimal restock estimate: sum of (cost × qtySold over trailing window
    // × month-end multiplier). Picks a 1.0 multiplier so the result reads
    // as "cost to restock at last-month rate." Higher-margin SKUs first
    // become the budget-constrained subset below.
    const trailingStart = new Date(now); trailingStart.setDate(trailingStart.getDate() - TRAILING_DAYS)
    const { data: salesRows } = await supabase
      .from('sales')
      .select('product_id, qty, products(name, cost, price)')
      .eq('store_id', storeId)
      .eq('type', 'sale')
      .gte('recorded_at', trailingStart.toISOString())

    if (!salesRows || salesRows.length === 0) continue

    type ProductTally = { name: string; cost: number; price: number; qty: number; restockCost: number; margin: number }
    const tally = new Map<string, ProductTally>()
    for (const r of salesRows as unknown as Array<{ product_id: string; qty: number; products: { name: string; cost: number; price: number } | { name: string; cost: number; price: number }[] | null }>) {
      const product = Array.isArray(r.products) ? r.products[0] : r.products
      if (!product) continue
      const existing = tally.get(r.product_id)
      const cost = Number(product.cost)
      const price = Number(product.price)
      const margin = price > 0 ? 1 - cost / price : 0
      if (existing) {
        existing.qty += Number(r.qty)
        existing.restockCost = existing.qty * existing.cost
      } else {
        tally.set(r.product_id, { name: product.name, cost, price, qty: Number(r.qty), restockCost: Number(r.qty) * cost, margin })
      }
    }

    const products = [...tally.values()]
    const optimalRestock = products.reduce((s, p) => s + p.restockCost, 0)
    if (optimalRestock <= cashBalance) continue // no gap, no push

    // Budget-constrained subset: highest margin first, take while budget remains.
    const ranked = [...products].sort((a, b) => b.margin - a.margin)
    const subset: ProductTally[] = []
    let used = 0
    for (const p of ranked) {
      if (used + p.restockCost > cashBalance) continue
      subset.push(p)
      used += p.restockCost
    }
    if (await alreadyAlertedRecently(supabase, storeId, FEATURE_MARKER, DEDUP_WINDOW_HOURS)) continue

    const subsetSummary = subset.slice(0, 5).map(p => p.name).join(', ')
    const body = `Month-end is ${daysToMonthEnd === 0 ? 'today' : `${daysToMonthEnd} day${daysToMonthEnd === 1 ? '' : 's'} away`}. Optimal restock = R${Math.round(optimalRestock).toLocaleString('en-ZA')}. Your float = R${Math.round(cashBalance).toLocaleString('en-ZA')}. Tap for the best plan that fits.`

    const result = await sendAndPersist(
      supabase, storeId, subs,
      { title: '💡 Working capital gap', body, url: '/inventory?focus=restock' },
      'ai_insight',
      `${FEATURE_MARKER} Working-capital gap: optimal R${Math.round(optimalRestock).toLocaleString('en-ZA')}, available R${Math.round(cashBalance).toLocaleString('en-ZA')}. Priority: ${subsetSummary}.`,
    )
    sent += result.sent
  }

  return NextResponse.json({ sent })
}

export async function GET(req: Request) { return POST(req) }
