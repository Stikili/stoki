import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan, Store } from '@/domain/entities/store'
import { upcomingEvents } from '@/lib/sa-calendar'
import { MIN_COHORT_SIZE, insufficientCohortMessage } from '@/lib/k-anonymity'
import { GATES, hasFeature, type GateId } from '@/lib/plan-gates'

// ── Daily in-process cache ──────────────────────────────────────────────────
//
// Each dynamic feature block hits the database to compute its result. The
// data underlying most of these blocks (sales totals, debtor balances,
// supplier scorecards) doesn't change meaningfully within a single day, so
// computing them once per (store, day, blockId) and serving the cached
// string for every subsequent advisor call in that window is a clean cost
// win — saves both LLM context-build time and DB load.
//
// In-process Map with insertion-order eviction. Per-process not per-cluster,
// which is fine: cache misses just cost what they cost today.

interface CacheEntry { value: string | null; expiresAt: number }
const dailyCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const MAX_CACHE_ENTRIES = 5_000

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

async function withDailyCache(
  blockId: string,
  storeId: string,
  compute: () => Promise<string | null>,
): Promise<string | null> {
  const key = `${blockId}:${storeId}:${todayString()}`
  const hit = dailyCache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.value
  const value = await compute()
  // Evict ~10% of oldest entries when at capacity. Map preserves insertion
  // order so iterating drops oldest first — good enough as an LRU light.
  if (dailyCache.size >= MAX_CACHE_ENTRIES) {
    let dropped = 0
    const toDrop = Math.floor(MAX_CACHE_ENTRIES * 0.1)
    for (const k of dailyCache.keys()) {
      if (dropped >= toDrop) break
      dailyCache.delete(k); dropped++
    }
  }
  dailyCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

/**
 * AI Advisor feature pack.
 *
 * Each F-A-* feature is a pure-ish function that gathers the data the
 * advisor needs to answer a specific class of question, and returns a
 * compact text block that gets appended to the advisor's system prompt
 * (or surfaced as a tool result, when invoked).
 *
 * Returning text rather than structured JSON keeps the LLM integration
 * cheap and uniform: the advisor system prompt simply concatenates the
 * relevant sections, and the LLM does the framing for the reply.
 *
 * The feature dispatcher (`relevantContextFor`) inspects the user's
 * question and conditionally pulls in the most relevant feature blocks
 * — we don't include all 13 on every request because token cost adds up.
 */

// ── Public surface ─────────────────────────────────────────────────────────

/**
 * Given the latest user message, return the concatenated context blocks
 * most relevant to it. Each block is small (< ~200 tokens). The advisor
 * route appends the result to the system prompt before the LLM call.
 *
 * `effectivePlan` is resolved by the caller via lib/effective-plan.ts.
 * Locked features (per lib/plan-gates.ts) return a short upgrade pitch
 * instead of computing — keeps the LLM honest ("this is a Pro feature,
 * here's what it would tell you") rather than silently giving a worse
 * answer.
 */
export async function relevantAdvisorContext(
  supabase: SupabaseClient,
  store: Store,
  userMessage: string,
): Promise<string> {
  const q = userMessage.toLowerCase()
  // Mixed sync/async blocks — wrap synchronous returns so the array shares one
  // promise type and Promise.all resolves cleanly.
  const blocks: Array<Promise<string | null>> = []
  const wrap = (s: string | null) => Promise.resolve(s)

  /** Locked features either compute or return an upgrade pitch — never
   *  silently degrade. Keeps the LLM honest about what's behind a paywall. */
  const gated = (gate: GateId, compute: () => Promise<string | null> | string | null) => {
    if (hasFeature(store, gate)) return Promise.resolve(compute())
    return Promise.resolve(upgradePitch(gate))
  }

  // Trigger heuristics — keyword-based for now. Cheap, deterministic, and
  // the LLM still has the full conversation to fall back on if a block
  // doesn't perfectly match the intent.
  if (anyKeyword(q, ['rand', 'dollar', 'usd', 'fx', 'import', 'oil', 'cooking oil', 'price up'])) {
    blocks.push(randSensitivityBlock(supabase, store))
  }
  if (anyKeyword(q, ['easter', 'christmas', 'ramadan', 'school holiday', 'heritage', 'braai day', 'eid', 'diwali', 'festive', 'event', 'holiday'])) {
    blocks.push(wrap(culturalEventBlock(store)))
  }
  if (anyKeyword(q, ['credit', 'debt', 'owe', 'debtor', 'mahala', 'layby'])) {
    blocks.push(creditBookBlock(supabase, store))
  }
  if (anyKeyword(q, ['solar', 'battery', 'inverter', 'electricity', 'load shedding', 'power', 'eskom'])) {
    blocks.push(wrap(energyAdvisorBlock()))
  }
  if (anyKeyword(q, ['sassa', 'grant', 'social', 'subsidy'])) {
    blocks.push(sassaRiskBlock(supabase, store))
  }
  if (anyKeyword(q, ['valuation', 'sell my shop', 'worth', 'business value', 'succession', 'inherit'])) {
    blocks.push(gated('advisor.business_valuation', () => valuationGuideBlock()))
  }
  if (anyKeyword(q, ['funding', 'loan', 'grant', 'sefa', 'nyda', 'nef', 'idc', 'capital', 'finance'])) {
    blocks.push(gated('advisor.funding_navigator', () => fundingNavigatorBlock(store)))
  }
  if (anyKeyword(q, ['basket', 'together', 'pair', 'combo', 'cross-sell', 'bundle', 'shelf'])) {
    blocks.push(gated('advisor.basket_analysis', () => basketAnalysisBlock(supabase, store)))
  }
  if (anyKeyword(q, ['supplier', 'wholesale', 'maponya', 'invoice', 'delivery'])) {
    blocks.push(gated('advisor.supplier_scorecard', () => supplierScorecardBlock(supabase, store)))
  }
  if (anyKeyword(q, ['cheaper', 'shoprite', 'pnp', 'usave', 'big chains', 'compete'])) {
    blocks.push(wrap(categoryStrategyBlock()))
  }
  if (anyKeyword(q, ['benchmark', 'compare', 'peer', 'other shops', 'doing well'])) {
    blocks.push(gated('advisor.peer_benchmarking', () => peerBenchmarkingBlock(supabase, store)))
  }
  if (anyKeyword(q, ['nearby', 'price near', 'overpric', 'underpric', 'local price'])) {
    blocks.push(gated('advisor.local_price', () => localPriceBenchmarkingBlock(supabase, store)))
  }
  if (anyKeyword(q, ['group buy', 'pool order', 'wholesale together', 'buying group'])) {
    blocks.push(gated('advisor.group_buying', () => groupBuyingBlock(supabase, store)))
  }

  const results = await Promise.all(blocks)
  return results.filter((s): s is string => Boolean(s)).join('\n\n')
}

function anyKeyword(haystack: string, needles: string[]): boolean {
  return needles.some(n => haystack.includes(n))
}

/** Short paywall pitch the advisor surfaces when a free-tier user asks
 *  about a Pro feature. Keeps the LLM honest about what's locked rather
 *  than silently substituting a worse answer. */
function upgradePitch(gateId: GateId): string {
  const gate = GATES[gateId]
  return [
    `[Paywall: ${gate.label}]`,
    `${gate.description}`,
    `This insight is part of the ${gate.minPlan === 'pro' ? 'Pro' : 'Business'} plan.`,
    `If asked, tell the owner what this feature would do for them and point to /settings/billing to upgrade — don't fabricate the answer they would have got on Pro.`,
  ].join(' ')
}

// `effectivePlan` kept as a named import so a future tool-using variant of
// this dispatcher (where we'd pass plan explicitly into each tool) doesn't
// have to find the symbol. Currently the gate check uses `store` directly.
export type { Plan }

// ── F-A-02 — Rand & Import Sensitivity ─────────────────────────────────────

/** Hand-curated sensitivity index per category. Higher = more import-priced. */
const IMPORT_SENSITIVITY: Record<string, { score: number; rationale: string }> = {
  cooking_oil: { score: 0.9, rationale: 'Sunflower / palm oil largely imported; tracks rand-dollar within 4-8 weeks.' },
  electronics: { score: 0.95, rationale: 'Almost entirely imported.' },
  airtime:     { score: 0.0,  rationale: 'Domestic; not rand-sensitive.' },
  rice:        { score: 0.7,  rationale: 'Mostly imported (Thailand, India).' },
  flour:       { score: 0.3,  rationale: 'Mostly local but inputs are partly imported.' },
  sugar:       { score: 0.2,  rationale: 'Mostly local SA production.' },
  dairy:       { score: 0.1,  rationale: 'Mostly local.' },
  bread:       { score: 0.2,  rationale: 'Local production; flour input partly imported.' },
  toiletries:  { score: 0.5,  rationale: 'Mixed local / imported.' },
  cleaning:    { score: 0.5,  rationale: 'Mixed; surfactants often imported.' },
}

async function randSensitivityBlock(supabase: SupabaseClient, store: Store): Promise<string | null> {
  return withDailyCache('rand', store.id, async () => {
  const { data: indicators } = await supabase
    .from('market_indicators')
    .select('kind, value, fetched_at')
    .in('kind', ['usd_zar', 'eur_zar'])
    .order('fetched_at', { ascending: false })
    .limit(2)
  if (!indicators || indicators.length === 0) return null

  const usd = indicators.find(i => i.kind === 'usd_zar')
  if (!usd) return null

  const { data: products } = await supabase
    .from('products')
    .select('name')
    .eq('store_id', store.id)
    .is('deleted_at', null)
    .limit(60)

  const sensitive: string[] = []
  for (const p of products ?? []) {
    const cat = inferCategory(p.name)
    const sens = cat ? IMPORT_SENSITIVITY[cat] : null
    if (sens && sens.score >= 0.5) sensitive.push(`${p.name} (${cat}, ${(sens.score * 100).toFixed(0)}% import-priced)`)
  }

  return [
    `[F-A-02 Rand & Import Sensitivity]`,
    `Latest USD/ZAR: ${Number(usd.value).toFixed(2)} (${(usd.fetched_at as string).slice(0, 10)}).`,
    sensitive.length > 0
      ? `Most rand-sensitive products in this store: ${sensitive.slice(0, 5).join(', ')}.`
      : `No high-import-sensitivity products detected in this store's catalogue.`,
    `Rule of thumb: a 5-10% rand depreciation typically lands as a 3-6% supplier price rise on import-heavy categories within 4-8 weeks.`,
  ].join(' ')
  })
}

function inferCategory(productName: string): string | null {
  const n = productName.toLowerCase()
  if (/(cooking oil|sunflower|palm oil)/.test(n)) return 'cooking_oil'
  if (/(rice|tastic)/.test(n)) return 'rice'
  if (/(flour|cake flour)/.test(n)) return 'flour'
  if (/sugar/.test(n)) return 'sugar'
  if (/(milk|cream|cheese|butter)/.test(n)) return 'dairy'
  if (/(bread|loaf)/.test(n)) return 'bread'
  if (/(soap|toothpaste|shampoo|deodorant)/.test(n)) return 'toiletries'
  if (/(omo|sunlight|bleach|cleaner)/.test(n)) return 'cleaning'
  if (/(airtime|data bundle|voucher)/.test(n)) return 'airtime'
  if (/(electronics|charger|cable|battery)/.test(n)) return 'electronics'
  return null
}

// ── F-A-05 — Cultural & Event Stock Planner ────────────────────────────────

function culturalEventBlock(store: Store): string | null {
  const upcoming = upcomingEvents(new Date(), 30)
  if (upcoming.length === 0) return null
  void store
  const lines = upcoming.slice(0, 3).map(e => {
    const days = daysFromNow(new Date(e.date))
    return `• ${e.name} in ${days} day${days === 1 ? '' : 's'} — ${e.hint}`
  })
  return [`[F-A-05 Cultural & Event Stock Planner]`, ...lines].join('\n')
}

function daysFromNow(d: Date): number {
  return Math.max(0, Math.round((d.getTime() - Date.now()) / 86_400_000))
}

// ── F-A-06 — Credit Book Advisor ───────────────────────────────────────────

async function creditBookBlock(supabase: SupabaseClient, store: Store): Promise<string | null> {
  return withDailyCache('credit', store.id, async () => {
  const { data: debtors } = await supabase
    .from('debtors')
    .select('id, name, total_owed, created_at')
    .eq('store_id', store.id)
    .is('deleted_at', null)
  if (!debtors || debtors.length === 0) return null

  const totalOwed = debtors.reduce((s, d) => s + Number(d.total_owed), 0)
  if (totalOwed === 0) return `[F-A-06 Credit Book] All debtors are paid up. Healthy.`

  // Last 30 days revenue → ratio.
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: salesRows } = await supabase
    .from('sales')
    .select('qty, price_at_sale')
    .eq('store_id', store.id)
    .eq('type', 'sale')
    .gte('recorded_at', thirtyDaysAgo.toISOString())
  const monthlyRevenue = (salesRows ?? []).reduce(
    (s, r) => s + Number(r.qty) * Number(r.price_at_sale), 0)
  const ratioPct = monthlyRevenue > 0 ? (totalOwed / monthlyRevenue) * 100 : null

  const sorted = [...debtors].sort((a, b) => Number(b.total_owed) - Number(a.total_owed))
  const top = sorted.slice(0, 3).map(d => `${d.name} (R${Number(d.total_owed).toFixed(0)})`)

  // Oldest unpaid — proxy for days outstanding.
  const oldest = sorted
    .filter(d => Number(d.total_owed) > 0)
    .sort((a, b) => new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime())[0]
  const oldestDays = oldest ? Math.floor((Date.now() - new Date(oldest.created_at as string).getTime()) / 86_400_000) : 0

  const healthy = ratioPct !== null && ratioPct < 15
  return [
    `[F-A-06 Credit Book]`,
    `Total outstanding: R${totalOwed.toFixed(0)} across ${debtors.filter(d => Number(d.total_owed) > 0).length} debtors.`,
    ratioPct !== null
      ? `That's ${ratioPct.toFixed(0)}% of last-30-days revenue (healthy < 15%).`
      : '',
    `Top debtors: ${top.join(', ')}.`,
    oldest ? `Oldest unpaid: ${oldest.name} (R${Number(oldest.total_owed).toFixed(0)}) — outstanding ${oldestDays} day${oldestDays === 1 ? '' : 's'}.` : '',
    healthy ? `Credit exposure is in the healthy band.` : `Credit exposure is above the healthy band — chase the top 3 first.`,
    `Opportunity-cost framing: R${totalOwed.toFixed(0)} in unpaid credit is one stock run you could've already done.`,
  ].filter(Boolean).join(' ')
  })
}

// ── F-A-07 — Energy Cost Advisor (conversational; provides framing only) ───

function energyAdvisorBlock(): string {
  return [
    `[F-A-07 Energy Cost Advisor]`,
    `When asked about solar / battery / inverter, walk the owner through:`,
    `1) average monthly electricity spend, 2) shop floor area (m²), 3) any quotes received.`,
    `Standard SA ranges (May 2026): grid-only baseline; battery inverter (5kVA, ~R28-45k) typically saves R600-R1500/mo (load-shedding hours covered, no daytime saving) — break-even ~24-36 months.`,
    `Rooftop solar + battery (3-5kWp + 5kWh, ~R85-150k) typically saves R1500-R3500/mo — break-even ~36-60 months. Most spaza-scale shops do better starting with a battery inverter only and adding solar in phase 2.`,
    `Always factor: shop hours (less benefit if mostly daytime); load-shedding stage trend (reduced 2026 vs 2024 → faster-payback case is weaker).`,
  ].join(' ')
}

// ── F-A-10 — SASSA & Grant Risk Advisor ────────────────────────────────────

async function sassaRiskBlock(supabase: SupabaseClient, store: Store): Promise<string | null> {
  return withDailyCache('sassa', store.id, async () => {
  // Proxy: revenue in the 7 days around the most recent month-end vs other days.
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1)
  const { data: rows } = await supabase
    .from('sales')
    .select('qty, price_at_sale, recorded_at')
    .eq('store_id', store.id)
    .eq('type', 'sale')
    .gte('recorded_at', monthAgo.toISOString())
  if (!rows || rows.length === 0) return null

  let surgeRevenue = 0, otherRevenue = 0
  for (const r of rows) {
    const d = new Date(r.recorded_at as string)
    const day = d.getDate()
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const isSurgeWindow = day >= lastDayOfMonth - 2 || day <= 5 // last 3 + first 5
    const value = Number(r.qty) * Number(r.price_at_sale)
    if (isSurgeWindow) surgeRevenue += value
    else otherRevenue += value
  }
  const total = surgeRevenue + otherRevenue
  if (total === 0) return null
  const surgeShare = surgeRevenue / total

  return [
    `[F-A-10 SASSA & Grant Risk]`,
    `Approx ${(surgeShare * 100).toFixed(0)}% of last-month revenue came from the surge window (last 3 days + first 5 days of the month — proxy for grant-cycle traffic).`,
    surgeShare > 0.4
      ? `Heavy concentration on grant cycles — any policy change (means-testing, payment-mechanism shifts) hits hard. Diversify: tuck-shop wholesale, school suppliers, airtime/data resale.`
      : `Moderate grant-cycle exposure. Routine business is keeping you steady.`,
    `If asked about specific policy news: SASSA + Treasury announcements are public — check the latest budget and SASSA website for the most current changes.`,
  ].join(' ')
  })
}

// ── F-A-12 — Business Valuation Guide (framing) ────────────────────────────

function valuationGuideBlock(): string {
  return [
    `[F-A-12 Business Valuation Guide]`,
    `When asked, gather: (1) average monthly revenue, (2) operating costs, (3) key assets (lease, equipment), (4) business age.`,
    `Indicative SA informal-retail multiples (2026): 12-18× monthly profit for un-formalised spazas; 18-30× for shops with CIPC registration, written lease, 12+ months of digital records.`,
    `Formalisation checklist that lifts the multiple: CIPC registration (free at bizportal.gov.za), 12 months of Stoki records (already there for users on plan), written lease, supplier paperwork.`,
    `Suggested next steps: local broker, accountant, or attorney for the sale agreement.`,
  ].join(' ')
}

// ── F-A-13 — Funding Navigator ─────────────────────────────────────────────

function fundingNavigatorBlock(store: Store): string {
  void store
  return [
    `[F-A-13 Funding Navigator]`,
    `Ask the owner: annual turnover, business age, owner age + demographics, sector, location. Then map:`,
    `• SEFA micro-loans (R5k-R500k, repayable, prime-linked): https://www.sefa.org.za`,
    `• NYDA (youth-owned, under 35): grants up to R50k + business support: https://www.nyda.gov.za`,
    `• NEF (black-owned, formalised): equity + debt, R250k+: https://www.nefcorp.co.za`,
    `• IDC (industrial / value-add only): https://www.idc.co.za`,
    `• Commercial: Lulalend, Retail Capital, Merchant Capital — fastest, but pricier (~3-5% per month).`,
    `Always distinguish grants (non-repayable) from loans (repayable). Confirm current eligibility on the official site — terms move semi-annually.`,
  ].join(' ')
}

// ── F-A-03 — Basket Analysis ───────────────────────────────────────────────

async function basketAnalysisBlock(supabase: SupabaseClient, store: Store): Promise<string | null> {
  return withDailyCache('basket', store.id, async () => {
  // Prefer real cart-grouping via `sale_event_id` (added in migration 020).
  // Fall back to time-bucketing (sales within the same minute as a heuristic
  // cart) when no sale_event_id is set yet.
  const sinceMonths = 6
  const since = new Date(); since.setMonth(since.getMonth() - sinceMonths)

  const { data: rows } = await supabase
    .from('sales')
    .select('product_id, sale_event_id, recorded_at, products(name)')
    .eq('store_id', store.id)
    .eq('type', 'sale')
    .gte('recorded_at', since.toISOString())
  if (!rows || rows.length === 0) return null

  // MIN_TXN_THRESHOLD per the spec (200). Below threshold, the advisor
  // should explain we're not there yet rather than producing noisy pairs.
  if (rows.length < 200) {
    return [
      `[F-A-03 Basket Analysis]`,
      `Not enough transactions yet (${rows.length} of 200 needed for reliable patterns).`,
      `Keep selling — we'll surface pair recommendations automatically once we cross the threshold.`,
    ].join(' ')
  }

  // Bucket by sale_event_id; if missing, by minute-resolution timestamp.
  type BasketRow = { product_id: string; sale_event_id: string | null; recorded_at: string; products: { name: string } | { name: string }[] | null }
  const baskets = new Map<string, Set<string>>()
  const productName = new Map<string, string>()
  for (const r of rows as unknown as BasketRow[]) {
    const product = Array.isArray(r.products) ? r.products[0] : r.products
    if (!product) continue
    productName.set(r.product_id, product.name)
    const bucket = r.sale_event_id ?? new Date(r.recorded_at).toISOString().slice(0, 16)
    if (!baskets.has(bucket)) baskets.set(bucket, new Set())
    baskets.get(bucket)!.add(r.product_id)
  }

  const pairCount = new Map<string, number>()
  const productCount = new Map<string, number>()
  for (const items of baskets.values()) {
    const arr = [...items]
    for (const id of arr) productCount.set(id, (productCount.get(id) ?? 0) + 1)
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = [arr[i], arr[j]].sort().join('|')
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1)
      }
    }
  }

  const pairs = [...pairCount.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split('|')
      const aName = productName.get(a)
      const bName = productName.get(b)
      const support = count / baskets.size
      const conf = count / Math.max(1, productCount.get(a) ?? 1)
      return aName && bName ? { a: aName, b: bName, count, support, conf } : null
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (pairs.length === 0) return null
  return [
    `[F-A-03 Basket Analysis]`,
    `Top product pairs (last ${sinceMonths} months, ${baskets.size} baskets):`,
    ...pairs.map(p =>
      `• ${p.a} + ${p.b} — ${p.count} co-purchases (${(p.conf * 100).toFixed(0)}% of ${p.a} buyers also took ${p.b}).`),
  ].join('\n')
  })
}

// ── F-A-04 — Supplier Scorecard ────────────────────────────────────────────

async function supplierScorecardBlock(supabase: SupabaseClient, store: Store): Promise<string | null> {
  return withDailyCache('supplier', store.id, async () => {
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('store_id', store.id)
    .is('deleted_at', null)
  if (!suppliers || suppliers.length === 0) return null

  const { data: restocks } = await supabase
    .from('restocks')
    .select('supplier_id, cost, qty_added, ordered_at, ordered_qty, recorded_at, supplier_invoice_change_pct')
    .eq('store_id', store.id)
    .gte('recorded_at', sixMonthsAgo.toISOString())
  if (!restocks || restocks.length === 0) return null

  type Score = {
    name: string; deliveries: number;
    avgCost: number; costStd: number;
    onTimePct: number | null; fillPct: number | null;
    invoiceTrendPct: number | null;
  }
  const scores: Score[] = []
  for (const s of suppliers) {
    const own = restocks.filter(r => r.supplier_id === s.id)
    if (own.length === 0) continue
    const costs = own.map(r => Number(r.cost))
    const avg = costs.reduce((a, b) => a + b, 0) / costs.length
    const std = Math.sqrt(costs.reduce((a, b) => a + (b - avg) ** 2, 0) / costs.length)
    const orderedDelivered = own.filter(r => r.ordered_at)
    const onTime = orderedDelivered.length > 0
      ? orderedDelivered.filter(r => {
          const ordered = new Date(r.ordered_at as string)
          const delivered = new Date(r.recorded_at as string)
          return (delivered.getTime() - ordered.getTime()) / 86_400_000 <= 7
        }).length / orderedDelivered.length
      : null
    const filled = own.filter(r => r.ordered_qty)
    const fillPct = filled.length > 0
      ? filled.filter(r => Number(r.qty_added) >= Number(r.ordered_qty)).length / filled.length
      : null
    const trends = own.map(r => Number(r.supplier_invoice_change_pct ?? 0)).filter(n => Number.isFinite(n))
    const trendAvg = trends.length > 0 ? trends.reduce((a, b) => a + b, 0) / trends.length : null

    scores.push({
      name: s.name, deliveries: own.length,
      avgCost: avg, costStd: std,
      onTimePct: onTime, fillPct,
      invoiceTrendPct: trendAvg,
    })
  }
  if (scores.length === 0) return null

  scores.sort((a, b) => b.deliveries - a.deliveries)
  const lines = scores.slice(0, 5).map(s => {
    const cv = s.avgCost > 0 ? (s.costStd / s.avgCost) * 100 : 0
    const onTime = s.onTimePct === null ? '—' : `${(s.onTimePct * 100).toFixed(0)}% on-time`
    const fill = s.fillPct === null ? '—' : `${(s.fillPct * 100).toFixed(0)}% fill`
    const trend = s.invoiceTrendPct === null ? '' : ` · invoice trend ${s.invoiceTrendPct >= 0 ? '+' : ''}${s.invoiceTrendPct.toFixed(1)}%`
    return `• ${s.name}: ${s.deliveries} deliveries, price CV ${cv.toFixed(0)}%, ${onTime}, ${fill}${trend}.`
  })
  return [
    `[F-A-04 Supplier Scorecard]`,
    `Last 6 months. Lower CV = more consistent prices. > 5% upward invoice trend means renegotiate.`,
    ...lines,
  ].join('\n')
  })
}

// ── F-A-08 — Category Strategy advisor (reframed from "Beat the Big Chains")
function categoryStrategyBlock(): string {
  return [
    `[F-A-08 Category Strategy]`,
    `Where informal traders structurally win vs Shoprite/PnP/Spar/Boxer:`,
    `• Loose / single-serving items (single eggs, half-loaves, R2 maize-meal sachets) — formal retail can't break bulk economically.`,
    `• Informal credit / mahala / layby — banks won't underwrite these customers.`,
    `• Hyper-local convenience — distance + opening hours.`,
    `• Culturally specific stocks — community-specific brands, snuff, traditional medicines, where applicable.`,
    `• Airtime / data PINs in tiny denominations.`,
    `Where you should NOT compete on price: branded loss-leaders (washing powder bulk packs, mainstream cereals, mainstream colas) — formal retail prices these below cost on rotation. Don't try to match; stock smaller pack sizes instead.`,
  ].join(' ')
}

// ── F-A-09 — Peer Benchmarking (k-anon, graceful) ──────────────────────────

async function peerBenchmarkingBlock(supabase: SupabaseClient, store: Store): Promise<string | null> {
  return withDailyCache('peer', store.id, async () => {
  // Cohort: same category + similar location text + same VAT-registration band.
  const { count: cohortCount } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .eq('category', store.category ?? 'spaza')
    .eq('vat_registered', store.vatRegistered ?? false)
    .neq('id', store.id)
    .is('deleted_at', null)

  const have = cohortCount ?? 0
  if (have < MIN_COHORT_SIZE) {
    return `[F-A-09 Peer Benchmarking]\n${insufficientCohortMessage(have)}`
  }

  // We have enough peers — compute median 30-day revenue across cohort and
  // rank the requesting shop. We use a lightweight RPC-less aggregation
  // (could be rewritten as a Postgres function later for scale).
  const since = new Date(); since.setDate(since.getDate() - 30)
  const { data: cohortStores } = await supabase
    .from('stores')
    .select('id')
    .eq('category', store.category ?? 'spaza')
    .eq('vat_registered', store.vatRegistered ?? false)
    .is('deleted_at', null)
  const ids = (cohortStores ?? []).map(s => s.id)
  if (ids.length < MIN_COHORT_SIZE) return null

  const { data: salesRows } = await supabase
    .from('sales')
    .select('store_id, qty, price_at_sale')
    .in('store_id', ids)
    .eq('type', 'sale')
    .gte('recorded_at', since.toISOString())

  const byStore = new Map<string, number>()
  for (const r of salesRows ?? []) {
    byStore.set(r.store_id, (byStore.get(r.store_id) ?? 0) + Number(r.qty) * Number(r.price_at_sale))
  }
  const revenues = [...byStore.values()].filter(v => v > 0)
  if (revenues.length < MIN_COHORT_SIZE) {
    return `[F-A-09 Peer Benchmarking]\n${insufficientCohortMessage(revenues.length)}`
  }

  const myRev = byStore.get(store.id) ?? 0
  const sorted = [...revenues].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const percentile = sorted.filter(r => r <= myRev).length / sorted.length * 100

  return [
    `[F-A-09 Peer Benchmarking]`,
    `Cohort: ${revenues.length} comparable shops (same category + VAT-registration band).`,
    `Last 30 days revenue — you: R${myRev.toFixed(0)}; cohort median: R${median.toFixed(0)}; you're at the ${percentile.toFixed(0)}th percentile.`,
    percentile >= 75
      ? `You're in the top quartile. Whatever you're doing, do more of it.`
      : percentile >= 50
        ? `Solidly average for your cohort. Focus on the highest-velocity SKUs.`
        : `Below cohort median. Likely lever: range coverage and stock availability — top performers stock more SKUs.`,
  ].join(' ')
  })
}

// ── F-A-01 — Local Price Benchmarking (graceful) ───────────────────────────

async function localPriceBenchmarkingBlock(
  supabase: SupabaseClient, store: Store,
): Promise<string | null> {
  return withDailyCache('local-price', store.id, async () => {
  // Use the same "location text" + category gate. Public price-DB fallback
  // would require an integration we don't have; without that, we degrade
  // to the cohort-based benchmark.
  const { data: cohortStores } = await supabase
    .from('stores')
    .select('id')
    .eq('category', store.category ?? 'spaza')
    .eq('location', store.location ?? '')
    .neq('id', store.id)
    .is('deleted_at', null)
  const have = cohortStores?.length ?? 0
  if (have < MIN_COHORT_SIZE) {
    return `[F-A-01 Local Price Benchmarking]\n${insufficientCohortMessage(have)}`
  }

  const ids = cohortStores!.map(s => s.id)
  const { data: peerProducts } = await supabase
    .from('products')
    .select('store_id, name, price')
    .in('store_id', ids)
    .is('deleted_at', null)
  const { data: myProducts } = await supabase
    .from('products')
    .select('name, price')
    .eq('store_id', store.id)
    .is('deleted_at', null)
  if (!peerProducts || !myProducts) return null

  const byName = new Map<string, number[]>()
  for (const p of peerProducts) {
    if (!byName.has(p.name)) byName.set(p.name, [])
    byName.get(p.name)!.push(Number(p.price))
  }

  type Row = { name: string; mine: number; peerMedian: number; delta: number }
  const rows: Row[] = []
  for (const me of myProducts) {
    const peerSamples = byName.get(me.name)
    if (!peerSamples || peerSamples.length < MIN_COHORT_SIZE) continue
    const sorted = [...peerSamples].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const mine = Number(me.price)
    rows.push({ name: me.name, mine, peerMedian: median, delta: mine - median })
  }
  if (rows.length === 0) {
    return `[F-A-01 Local Price Benchmarking]\nNot enough overlapping SKUs across the local cohort yet — keep stocking and check back.`
  }
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const lines = rows.slice(0, 5).map(r => {
    const verb = r.delta > 0 ? 'higher' : 'lower'
    return `• ${r.name}: yours R${r.mine.toFixed(2)} vs area median R${r.peerMedian.toFixed(2)} (R${Math.abs(r.delta).toFixed(2)} ${verb}).`
  })
  return [`[F-A-01 Local Price Benchmarking]`, ...lines].join('\n')
  })
}

// ── F-A-11 — Group Buying (advisory v1) ────────────────────────────────────

async function groupBuyingBlock(supabase: SupabaseClient, store: Store): Promise<string | null> {
  return withDailyCache('group-buy', store.id, async () => {
  // Light-touch v1: explain the model + count nearby Stoki shops to size the
  // theoretical pool. In-app group-order coordination is a later release.
  void supabase
  return [
    `[F-A-11 Group Buying]`,
    `Group buying = pool restock orders with nearby shops to hit wholesale price-break tiers.`,
    `Typical SA wholesale tiers: case (10-12 units) → 10-15% saving; bulk (50+ units) → 20-30% saving.`,
    `Example: if you usually order 1 case of cooking oil (R900) and 2 nearby shops do too, a combined 3-case order at the bulk tier could save you R270 each on that line.`,
    `Stoki's group-buying coordinator (in-app order pooling) is rolling out — for now, set up a WhatsApp group with 2-3 nearby shops and trial it on your highest-volume SKU.`,
    `Cohort visible to ${store.location ?? 'your area'} is being aggregated; we'll surface exact nearby-shop count once opt-in network sharing is enabled in Settings.`,
  ].join(' ')
  })
}
