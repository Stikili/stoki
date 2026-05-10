import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  authoriseCron, configureVapid, fetchAllStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'

/**
 * F-P-09 — Tax Threshold Warning.
 *
 * Weekly cron. For each store, computes year-to-date revenue against the
 * R1m SARS Turnover Tax threshold and pushes when the running total crosses
 * 80% (R800k) or 95% (R950k). Fires at most once per threshold per FY:
 * dedup uses a marker substring in the alerts table.
 *
 * Cron schedule: 0 7 * * 1 (weekly Monday 09:00 SAST).
 */

const TAX_YEAR_START_MONTH = 2 // March (SARS FY = 1 Mar – 28/29 Feb)
const THRESHOLDS = [
  { pct: 0.95, label: '95%', amount: 950_000, marker: 'TAX_T_95' },
  { pct: 0.80, label: '80%', amount: 800_000, marker: 'TAX_T_80' },
] as const
const THRESHOLD_CEILING = 1_000_000

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())
  configureVapid()

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  const storeIds = await fetchAllStoreIds(supabase)
  if (storeIds.length === 0) return NextResponse.json({ sent: 0 })

  const fyStart = financialYearStart(new Date())
  const fyStartIso = fyStart.toISOString()

  let sent = 0
  for (const storeId of storeIds) {
    const { data: salesRows } = await supabase
      .from('sales')
      .select('qty, price_at_sale')
      .eq('store_id', storeId)
      .eq('type', 'sale')
      .gte('recorded_at', fyStartIso)

    const ytdRevenue = (salesRows ?? []).reduce(
      (s, r) => s + Number(r.qty) * Number(r.price_at_sale), 0)

    // Crossed-95% wins over crossed-80% — only fire the highest unfired
    // threshold so the user sees one escalation step at a time.
    for (const t of THRESHOLDS) {
      if (ytdRevenue < t.amount) continue

      // Already fired for this FY? Look for the marker.
      const { data: prior } = await supabase
        .from('alerts')
        .select('id')
        .eq('store_id', storeId)
        .ilike('message', `%${t.marker}%`)
        .gte('created_at', fyStartIso)
        .limit(1)
      if ((prior ?? []).length > 0) break // already alerted; don't downgrade

      const remainingRand = THRESHOLD_CEILING - ytdRevenue
      const body = t.pct === 0.95
        ? `Your turnover this year is R${Math.round(ytdRevenue).toLocaleString('en-ZA')} — only R${Math.round(remainingRand).toLocaleString('en-ZA')} below R1m. Speak to an accountant urgently.`
        : `Your turnover just passed R${t.amount.toLocaleString('en-ZA')}. At R1m the SARS rules change. Get advice while there's still time to plan.`

      const result = await sendAndPersist(
        supabase, storeId, subs,
        { title: t.pct === 0.95 ? '🚨 Approaching R1m turnover' : '📋 Tax threshold reached',
          body, url: '/reports' },
        'ai_insight',
        `${t.marker}: YTD R${Math.round(ytdRevenue).toLocaleString('en-ZA')}. ${body}`,
      )
      sent += result.sent
      break
    }
  }

  return NextResponse.json({ sent })
}

export async function GET(req: Request) { return POST(req) }

/** SARS financial year starts 1 March. If we're before March of this calendar
 *  year, the FY started 1 March of the previous calendar year. */
function financialYearStart(now: Date): Date {
  const year = now.getMonth() + 1 >= TAX_YEAR_START_MONTH ? now.getFullYear() : now.getFullYear() - 1
  return new Date(year, TAX_YEAR_START_MONTH - 1, 1, 0, 0, 0)
}
