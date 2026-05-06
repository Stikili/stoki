import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  authoriseCron, configureVapid, distinctStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'
import { imminentPayEvent, nextSassaPayDates, formatGrantList } from '@/lib/sassa'

/**
 * F-P-05 — Month-End Surge Alert.
 *
 * Daily cron. Fires when there's a SASSA pay-day or calendar month-end
 * within the next 3 days. For each store, identifies the top-5 SKUs that
 * sold out in the comparable prior month-end window (using prior 60-day
 * sales). Pushes a stock-up advisory.
 *
 * Cron schedule: 0 7 * * * (07:00 UTC = 09:00 SAST).
 */

const SURGE_LEAD_DAYS = 3
const TOP_N_RISK = 5

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())
  if (!configureVapid()) return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 })

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  if (subs.length === 0) return NextResponse.json({ sent: 0 })

  const now = new Date()
  // Two surge triggers: SASSA pay-day OR calendar month-end. Take the
  // earliest one within the lead window.
  const sassa = imminentPayEvent(nextSassaPayDates(now, 3), SURGE_LEAD_DAYS, now)
  const monthEnd = nextMonthEnd(now)
  const monthEndDays = Math.floor((monthEnd.getTime() - now.getTime()) / 86_400_000)

  const surgeIn =
    sassa
      ? { source: 'sassa' as const, label: formatGrantList(sassa.grants),
          days: Math.floor((new Date(sassa.date).getTime() - now.getTime()) / 86_400_000) }
      : monthEndDays >= 0 && monthEndDays <= SURGE_LEAD_DAYS
        ? { source: 'month_end' as const, label: 'month-end', days: monthEndDays }
        : null

  if (!surgeIn) return NextResponse.json({ skipped: true, reason: 'no_imminent_surge' })

  // 60-day window ending now → top sellers (proxy for "what runs out at month-end").
  const windowStart = new Date(now); windowStart.setDate(windowStart.getDate() - 60)

  let sent = 0
  for (const storeId of distinctStoreIds(subs)) {
    const { data: rows } = await supabase
      .from('sales')
      .select('product_id, qty, products(name, qty)')
      .eq('store_id', storeId)
      .gte('recorded_at', windowStart.toISOString())
      .lte('recorded_at', now.toISOString())

    if (!rows || rows.length === 0) continue

    // Aggregate qty sold per product over the window. Higher qty = more
    // likely to be a surge-week stockout candidate.
    const tally = new Map<string, { name: string; soldQty: number; onHand: number }>()
    for (const r of rows as unknown as Array<{ product_id: string; qty: number; products: { name: string; qty: number } | { name: string; qty: number }[] | null }>) {
      const product = Array.isArray(r.products) ? r.products[0] : r.products
      if (!product) continue
      const existing = tally.get(r.product_id) ?? { name: product.name, soldQty: 0, onHand: Number(product.qty) }
      existing.soldQty += Number(r.qty)
      tally.set(r.product_id, existing)
    }

    const top = [...tally.values()]
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, TOP_N_RISK)
    if (top.length === 0) continue

    const names = top.map(t => t.name).join(', ')
    const dayWord = surgeIn.days === 0 ? 'today' : surgeIn.days === 1 ? 'tomorrow' : `in ${surgeIn.days} days`
    const body = `${cap(surgeIn.label.replace(/_/g, ' '))} is ${dayWord}. Your top sellers — ${names} — usually run hot. Stock up?`

    const result = await sendAndPersist(
      supabase, storeId, subs,
      { title: '📅 Month-end surge incoming', body, url: '/inventory?filter=top' },
      'ai_insight',
      `Surge ${dayWord} (${surgeIn.label}). Top movers to stock: ${names}.`,
    )
    sent += result.sent
  }

  return NextResponse.json({ sent, surge: surgeIn })
}

export async function GET(req: Request) { return POST(req) }

function nextMonthEnd(now: Date): Date {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return end
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
