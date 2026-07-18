import type { SupabaseClient } from '@supabase/supabase-js'
import type { AiTone } from '@/domain/entities/ai-tone'

/**
 * Monthly-report generator — "Your month, summarised."
 *
 * Fires on the 1st of every month via /api/cron/monthly-report. For every
 * active store, pulls the previous month's numbers, compares them to the
 * month before, and asks the AI to write a plain-English recap in the
 * owner's chosen tone (kasi / plain / professional / technical).
 *
 * Split responsibilities for testability:
 *   - `computeMonthlyStats(supabase, storeId, now)` — pure data pull
 *   - `buildSummaryPrompt(stats, tone)` — pure string builder
 *   - `generateMonthlySummary(client, stats, tone)` — the LLM call
 *
 * Tests hit the first two directly with fake data; only the cron route
 * touches the LLM.
 */

export interface MonthWindow {
  /** Human month name, e.g. "December". */
  name: string
  /** Inclusive start (00:00:00 local). */
  start: Date
  /** Inclusive end (23:59:59.999 local). */
  end: Date
}

export interface MonthlyStats {
  storeName: string
  storeCategory: string
  storeLocation: string | null
  prevMonth: MonthWindow
  monthBefore: MonthWindow
  revenue: {
    current: number
    prev: number
    delta: number
    deltaPct: number | null
  }
  txCount: {
    current: number
    prev: number
  }
  expenses: {
    current: number
    prev: number
    delta: number
    deltaPct: number | null
  }
  /** Net = revenue - expenses. Never surface as "P&L" or "profit" in copy —
   *  translate to plain SA English in the prompt. */
  net: {
    current: number
    prev: number
  }
  topProduct: {
    name: string
    qtySold: number
    revenue: number
  } | null
  bestDay: {
    dateIso: string
    revenue: number
  } | null
  debtors: {
    /** Distinct customers currently owing money. */
    owingCount: number
    /** Total currently outstanding. */
    outstanding: number
  }
  /** True if the store had zero sales AND zero expenses in prev month — the
   *  cron uses this to skip silent stores. No sense sending "you did R0" to
   *  someone who hasn't touched the app. */
  hasActivity: boolean
}

/** Convert a Date into a human "December" style month name. */
function monthName(d: Date): string {
  return d.toLocaleDateString('en-ZA', { month: 'long' })
}

/** Given "now", return the previous full calendar month and the month before it. */
export function monthWindows(now: Date): { prevMonth: MonthWindow; monthBefore: MonthWindow } {
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const beforeStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0)
  const beforeEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999)
  return {
    prevMonth: { name: monthName(prevStart), start: prevStart, end: prevEnd },
    monthBefore: { name: monthName(beforeStart), start: beforeStart, end: beforeEnd },
  }
}

interface SaleRow {
  qty: number
  price_at_sale: number
  recorded_at: string
  product_id: string | null
  product_name: string | null
  products?: { name?: string | null } | null
}

interface ExpenseRow {
  amount: number
  category: string
  recorded_at: string
}

interface DebtorRow {
  total_owed: number | string
}

/**
 * Pull raw data + roll it up into MonthlyStats. Independent of the LLM so
 * it can be exercised in tests without any HTTP mocks.
 */
export async function computeMonthlyStats(
  supabase: SupabaseClient,
  storeId: string,
  now: Date = new Date(),
): Promise<MonthlyStats> {
  const { prevMonth, monthBefore } = monthWindows(now)

  const { data: storeRow } = await supabase
    .from('stores')
    .select('name, category, location')
    .eq('id', storeId)
    .single()
  const storeName = (storeRow?.name as string) ?? 'Your store'
  const storeCategoryKey = (storeRow?.category as string | null) ?? 'other'
  const storeCategoryLabel = categoryLabel(storeCategoryKey)
  const storeLocation = (storeRow?.location as string | null) ?? null

  // Pull both month ranges of sales in a single query (min of the two
  // starts, max of the two ends) — cuts one round-trip. Bucket in memory.
  const rangeStart = new Date(Math.min(prevMonth.start.getTime(), monthBefore.start.getTime()))
  const rangeEnd = new Date(Math.max(prevMonth.end.getTime(), monthBefore.end.getTime()))

  const { data: allSales } = await supabase
    .from('sales')
    .select('qty, price_at_sale, recorded_at, product_id, product_name, products(name)')
    .eq('store_id', storeId)
    .gte('recorded_at', rangeStart.toISOString())
    .lte('recorded_at', rangeEnd.toISOString())

  const sales = (allSales ?? []) as unknown as SaleRow[]
  const currentSales = sales.filter(s => inWindow(s.recorded_at, prevMonth))
  const prevSales = sales.filter(s => inWindow(s.recorded_at, monthBefore))

  const currentRevenue = sumRevenue(currentSales)
  const prevRevenue = sumRevenue(prevSales)

  const { data: allExpenses } = await supabase
    .from('expenses')
    .select('amount, category, recorded_at')
    .eq('store_id', storeId)
    .gte('recorded_at', rangeStart.toISOString())
    .lte('recorded_at', rangeEnd.toISOString())

  const expenses = (allExpenses ?? []) as unknown as ExpenseRow[]
  const currentExpenseTotal = expenses.filter(e => inWindow(e.recorded_at, prevMonth))
    .reduce((s, e) => s + Number(e.amount), 0)
  const prevExpenseTotal = expenses.filter(e => inWindow(e.recorded_at, monthBefore))
    .reduce((s, e) => s + Number(e.amount), 0)

  const { data: debtorRows } = await supabase
    .from('debtors')
    .select('total_owed')
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .gt('total_owed', 0)
  const debtors = (debtorRows ?? []) as unknown as DebtorRow[]
  const outstanding = debtors.reduce((s, d) => s + Number(d.total_owed), 0)

  const revDelta = currentRevenue - prevRevenue
  const expDelta = currentExpenseTotal - prevExpenseTotal

  return {
    storeName,
    storeCategory: storeCategoryLabel,
    storeLocation,
    prevMonth,
    monthBefore,
    revenue: {
      current: round(currentRevenue),
      prev: round(prevRevenue),
      delta: round(revDelta),
      deltaPct: prevRevenue > 0 ? round((revDelta / prevRevenue) * 100, 1) : null,
    },
    txCount: {
      current: currentSales.length,
      prev: prevSales.length,
    },
    expenses: {
      current: round(currentExpenseTotal),
      prev: round(prevExpenseTotal),
      delta: round(expDelta),
      deltaPct: prevExpenseTotal > 0 ? round((expDelta / prevExpenseTotal) * 100, 1) : null,
    },
    net: {
      current: round(currentRevenue - currentExpenseTotal),
      prev: round(prevRevenue - prevExpenseTotal),
    },
    topProduct: topProduct(currentSales),
    bestDay: bestDay(currentSales),
    debtors: {
      owingCount: debtors.length,
      outstanding: round(outstanding),
    },
    hasActivity: currentSales.length > 0 || expenses.some(e => inWindow(e.recorded_at, prevMonth)),
  }
}

function inWindow(iso: string, w: MonthWindow): boolean {
  const t = new Date(iso).getTime()
  return t >= w.start.getTime() && t <= w.end.getTime()
}

function sumRevenue(rows: SaleRow[]): number {
  return rows.reduce((s, r) => s + Number(r.qty) * Number(r.price_at_sale), 0)
}

function topProduct(rows: SaleRow[]): MonthlyStats['topProduct'] {
  const byProduct = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const r of rows) {
    const name = r.products?.name ?? r.product_name ?? 'Unnamed item'
    const key = r.product_id ?? name
    const bucket = byProduct.get(key) ?? { name, qty: 0, revenue: 0 }
    bucket.qty += Number(r.qty)
    bucket.revenue += Number(r.qty) * Number(r.price_at_sale)
    byProduct.set(key, bucket)
  }
  const sorted = [...byProduct.values()].sort((a, b) => b.qty - a.qty)
  if (sorted.length === 0) return null
  const top = sorted[0]
  return { name: top.name, qtySold: round(top.qty, 2), revenue: round(top.revenue) }
}

function bestDay(rows: SaleRow[]): MonthlyStats['bestDay'] {
  const byDate = new Map<string, number>()
  for (const r of rows) {
    const day = r.recorded_at.slice(0, 10)
    const cur = byDate.get(day) ?? 0
    byDate.set(day, cur + Number(r.qty) * Number(r.price_at_sale))
  }
  if (byDate.size === 0) return null
  let bestDate = ''
  let bestRev = -Infinity
  for (const [date, rev] of byDate) {
    if (rev > bestRev) { bestRev = rev; bestDate = date }
  }
  return { dateIso: bestDate, revenue: round(bestRev) }
}

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp)
  return Math.round(n * f) / f
}

function categoryLabel(key: string): string {
  const labels: Record<string, string> = {
    spaza: 'spaza shop',
    general_dealer: 'general dealer',
    food_stall: 'food stall',
    other: 'shop',
  }
  return labels[key] ?? 'shop'
}

/**
 * Build the LLM prompt that generates the summary. Pure function — takes
 * stats + tone + returns { system, user } strings. Callers wire it into
 * whichever SDK they use.
 *
 * The user prompt gives the model the raw numbers, the deltas, and the
 * chosen register. The system prompt scopes it to "write a summary; no
 * tools; no jargon beyond what the tone permits".
 */
export function buildSummaryPrompt(stats: MonthlyStats, tone: AiTone): { system: string; user: string } {
  const system = `You are Stoki's monthly-summary writer. You are writing ONE short WhatsApp-friendly recap of the store's previous month for the owner.

TONE — the owner picked "${tone}":
- casual: kasi vibe, warm, "howzit boss" allowed sparingly. No jargon.
- plain: everyday SA English, no jargon. "Money you took in" not "revenue".
- professional: polite business tone, standard English, some retail terms.
- technical: full accounting terms okay — revenue, expenses, GP%, net.

Rules — non-negotiable:
- 4-6 sentences MAX. This gets pasted into WhatsApp / an alerts inbox.
- Rands (R) with two decimals when quoting a total.
- Do not invent numbers. Use only what the user prompt provides.
- Do not offer generic advice ("keep going!"). One concrete observation about what changed vs the month before, one thing worth noticing (top product, best day, debtors, or expense jump), and one gentle next-step or open question.
- No headings, no bullets, no emoji-spam — this is a conversational message.
- Do not name the tone in the output. Just USE it.`

  const parts: string[] = []
  parts.push(`Store: ${stats.storeName} (${stats.storeCategory}${stats.storeLocation ? `, ${stats.storeLocation}` : ''}).`)
  parts.push(`Month you're recapping: ${stats.prevMonth.name}. Compare against ${stats.monthBefore.name}.`)
  parts.push('')
  parts.push('The numbers:')
  parts.push(`- Money in (revenue): R${stats.revenue.current.toFixed(2)} (prev month R${stats.revenue.prev.toFixed(2)}, ${describeDelta(stats.revenue.delta, stats.revenue.deltaPct)})`)
  parts.push(`- Sales count: ${stats.txCount.current} (prev ${stats.txCount.prev})`)
  parts.push(`- Money out (expenses): R${stats.expenses.current.toFixed(2)} (prev R${stats.expenses.prev.toFixed(2)}, ${describeDelta(stats.expenses.delta, stats.expenses.deltaPct)})`)
  parts.push(`- Net (money-in minus money-out): R${stats.net.current.toFixed(2)} (prev R${stats.net.prev.toFixed(2)})`)
  if (stats.topProduct) {
    parts.push(`- Top-selling item: ${stats.topProduct.name} (${stats.topProduct.qtySold} sold, R${stats.topProduct.revenue.toFixed(2)})`)
  }
  if (stats.bestDay) {
    parts.push(`- Best day: ${stats.bestDay.dateIso} (R${stats.bestDay.revenue.toFixed(2)})`)
  }
  if (stats.debtors.owingCount > 0) {
    parts.push(`- Customers on credit: ${stats.debtors.owingCount} still owing R${stats.debtors.outstanding.toFixed(2)}`)
  }
  parts.push('')
  parts.push(`Write the ${stats.prevMonth.name} recap in the ${tone} tone. 4-6 sentences.`)

  return { system, user: parts.join('\n') }
}

function describeDelta(delta: number, deltaPct: number | null): string {
  if (delta === 0) return 'flat'
  const sign = delta > 0 ? '+' : ''
  const rand = `${sign}R${Math.abs(delta).toFixed(2)}`
  if (deltaPct === null) return delta > 0 ? `up ${rand}` : `down R${Math.abs(delta).toFixed(2)}`
  const pctStr = `${sign}${deltaPct.toFixed(1)}%`
  return delta > 0 ? `up ${rand} / ${pctStr}` : `down R${Math.abs(delta).toFixed(2)} / ${pctStr}`
}
