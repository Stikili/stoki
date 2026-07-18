import { describe, expect, it, vi } from 'vitest'
import { buildSummaryPrompt, computeMonthlyStats, monthWindows, type MonthlyStats } from './monthly-report'

describe('monthWindows', () => {
  it('returns previous full month and the month before it', () => {
    const now = new Date(2026, 1, 1) // 1 Feb 2026
    const { prevMonth, monthBefore } = monthWindows(now)
    // prev month = January 2026 (all of it)
    expect(prevMonth.name).toBe('January')
    expect(prevMonth.start.getMonth()).toBe(0)
    expect(prevMonth.start.getDate()).toBe(1)
    expect(prevMonth.end.getMonth()).toBe(0)
    expect(prevMonth.end.getDate()).toBe(31)
    // month before = December 2025
    expect(monthBefore.name).toBe('December')
    expect(monthBefore.start.getMonth()).toBe(11)
    expect(monthBefore.start.getFullYear()).toBe(2025)
  })

  it('wraps around January correctly — prev = December of previous year', () => {
    const now = new Date(2026, 0, 1) // 1 Jan 2026
    const { prevMonth, monthBefore } = monthWindows(now)
    expect(prevMonth.name).toBe('December')
    expect(prevMonth.start.getFullYear()).toBe(2025)
    expect(monthBefore.name).toBe('November')
    expect(monthBefore.start.getFullYear()).toBe(2025)
  })
})

/**
 * Fake supabase — mirrors the two-tier .from().select().eq()... chain the
 * repo uses. Each `from(table)` returns a builder that ignores further
 * chained filters and resolves to the caller-provided rows.
 */
function fakeSupabase(fixtures: {
  store?: { name?: string; category?: string | null; location?: string | null }
  sales?: Array<{ qty: number; price_at_sale: number; recorded_at: string; product_id?: string | null; product_name?: string | null; products?: { name: string } | null }>
  expenses?: Array<{ amount: number; category: string; recorded_at: string }>
  debtors?: Array<{ total_owed: number }>
}) {
  return {
    from(table: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        select() { return chain },
        eq() { return chain },
        gte() { return chain },
        lte() { return chain },
        is() { return chain },
        gt() { return chain },
        async single() {
          if (table === 'stores') {
            return {
              data: {
                name: fixtures.store?.name ?? 'Test Store',
                category: fixtures.store?.category ?? null,
                location: fixtures.store?.location ?? null,
              },
              error: null,
            }
          }
          return { data: null, error: null }
        },
        then(onFulfilled: (r: { data: unknown; error: null }) => unknown) {
          const data =
            table === 'sales' ? fixtures.sales ?? []
            : table === 'expenses' ? fixtures.expenses ?? []
            : table === 'debtors' ? fixtures.debtors ?? []
            : []
          return Promise.resolve({ data, error: null }).then(onFulfilled)
        },
      }
      return chain
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('computeMonthlyStats', () => {
  const now = new Date(2026, 1, 1) // 1 Feb 2026 → prev = Jan, monthBefore = Dec

  it('rolls up sales into current vs prev buckets with delta and pct', async () => {
    const supabase = fakeSupabase({
      sales: [
        // January (current) — R400
        { qty: 2, price_at_sale: 100, recorded_at: '2026-01-05T10:00:00Z', product_id: 'p1', product_name: 'Bread', products: { name: 'Bread' } },
        { qty: 1, price_at_sale: 200, recorded_at: '2026-01-20T10:00:00Z', product_id: 'p2', product_name: 'Milk', products: { name: 'Milk' } },
        // December (prev) — R200
        { qty: 1, price_at_sale: 200, recorded_at: '2025-12-15T10:00:00Z', product_id: 'p1', product_name: 'Bread', products: { name: 'Bread' } },
      ],
    })
    const stats = await computeMonthlyStats(supabase, 'store-1', now)
    expect(stats.revenue.current).toBe(400)
    expect(stats.revenue.prev).toBe(200)
    expect(stats.revenue.delta).toBe(200)
    expect(stats.revenue.deltaPct).toBe(100)
    expect(stats.txCount.current).toBe(2)
    expect(stats.txCount.prev).toBe(1)
    expect(stats.hasActivity).toBe(true)
  })

  it('picks the top product by qty across the current month', async () => {
    const supabase = fakeSupabase({
      sales: [
        { qty: 5, price_at_sale: 10, recorded_at: '2026-01-05T10:00:00Z', product_id: 'p1', product_name: 'A', products: { name: 'A' } },
        { qty: 8, price_at_sale: 5,  recorded_at: '2026-01-15T10:00:00Z', product_id: 'p2', product_name: 'B', products: { name: 'B' } },
      ],
    })
    const stats = await computeMonthlyStats(supabase, 's', now)
    expect(stats.topProduct?.name).toBe('B')
    expect(stats.topProduct?.qtySold).toBe(8)
  })

  it('picks the best day by revenue', async () => {
    const supabase = fakeSupabase({
      sales: [
        { qty: 1, price_at_sale: 100, recorded_at: '2026-01-05T10:00:00Z', product_id: null, product_name: 'X' },
        { qty: 3, price_at_sale: 100, recorded_at: '2026-01-06T10:00:00Z', product_id: null, product_name: 'X' },
        { qty: 1, price_at_sale: 50,  recorded_at: '2026-01-06T14:00:00Z', product_id: null, product_name: 'X' },
      ],
    })
    const stats = await computeMonthlyStats(supabase, 's', now)
    expect(stats.bestDay?.dateIso).toBe('2026-01-06')
    expect(stats.bestDay?.revenue).toBe(350)
  })

  it('reports hasActivity=false when both sales and expenses are empty', async () => {
    const supabase = fakeSupabase({ sales: [], expenses: [] })
    const stats = await computeMonthlyStats(supabase, 's', now)
    expect(stats.hasActivity).toBe(false)
    expect(stats.revenue.current).toBe(0)
    expect(stats.expenses.current).toBe(0)
  })

  it('reports hasActivity=true when only expenses exist', async () => {
    const supabase = fakeSupabase({
      sales: [],
      expenses: [{ amount: 250, category: 'rent', recorded_at: '2026-01-01T09:00:00Z' }],
    })
    const stats = await computeMonthlyStats(supabase, 's', now)
    expect(stats.hasActivity).toBe(true)
    expect(stats.expenses.current).toBe(250)
  })

  it('sets deltaPct to null when prev month is zero (no divide-by-zero)', async () => {
    const supabase = fakeSupabase({
      sales: [
        { qty: 2, price_at_sale: 50, recorded_at: '2026-01-05T10:00:00Z', product_id: null, product_name: 'X' },
      ],
    })
    const stats = await computeMonthlyStats(supabase, 's', now)
    expect(stats.revenue.prev).toBe(0)
    expect(stats.revenue.deltaPct).toBeNull()
  })

  it('aggregates outstanding debtor balances', async () => {
    const supabase = fakeSupabase({
      debtors: [{ total_owed: 120 }, { total_owed: 45.5 }],
    })
    const stats = await computeMonthlyStats(supabase, 's', now)
    expect(stats.debtors.owingCount).toBe(2)
    expect(stats.debtors.outstanding).toBe(165.5)
  })
})

describe('buildSummaryPrompt', () => {
  const baseStats: MonthlyStats = {
    storeName: 'Kagiso Kwikstop',
    storeCategory: 'spaza shop',
    storeLocation: 'Kagiso',
    prevMonth: { name: 'January', start: new Date(), end: new Date() },
    monthBefore: { name: 'December', start: new Date(), end: new Date() },
    revenue: { current: 12000, prev: 10000, delta: 2000, deltaPct: 20 },
    txCount: { current: 340, prev: 300 },
    expenses: { current: 3500, prev: 3000, delta: 500, deltaPct: 16.7 },
    net: { current: 8500, prev: 7000 },
    topProduct: { name: 'Bread', qtySold: 120, revenue: 1440 },
    bestDay: { dateIso: '2026-01-31', revenue: 850 },
    debtors: { owingCount: 4, outstanding: 380 },
    hasActivity: true,
  }

  it('names the tone in the system prompt so the model actually adapts', () => {
    const { system } = buildSummaryPrompt(baseStats, 'casual')
    expect(system).toContain('"casual"')
  })

  it('embeds current and prev revenue with two decimals', () => {
    const { user } = buildSummaryPrompt(baseStats, 'plain')
    expect(user).toContain('R12000.00')
    expect(user).toContain('R10000.00')
  })

  it('describes revenue delta with rand + percentage when both months had activity', () => {
    const { user } = buildSummaryPrompt(baseStats, 'plain')
    expect(user).toMatch(/up \+R2000\.00 \/ \+20\.0%/)
  })

  it('describes flat delta as "flat"', () => {
    const flat = { ...baseStats, revenue: { current: 100, prev: 100, delta: 0, deltaPct: 0 } }
    const { user } = buildSummaryPrompt(flat, 'plain')
    expect(user).toMatch(/flat/)
  })

  it('omits top-product line when there was no top product', () => {
    const stats = { ...baseStats, topProduct: null }
    const { user } = buildSummaryPrompt(stats, 'plain')
    expect(user).not.toMatch(/Top-selling item/)
  })

  it('omits debtors line when nobody owes money', () => {
    const stats = { ...baseStats, debtors: { owingCount: 0, outstanding: 0 } }
    const { user } = buildSummaryPrompt(stats, 'plain')
    expect(user).not.toMatch(/Customers on credit/)
  })

  it('caps output length instruction to 4-6 sentences', () => {
    const { system } = buildSummaryPrompt(baseStats, 'plain')
    expect(system).toMatch(/4-6 sentences/i)
  })

  it('technical tone still runs the same builder — no branching by tone here', () => {
    const { system, user } = buildSummaryPrompt(baseStats, 'technical')
    expect(system).toContain('"technical"')
    // Same data lines regardless of tone
    expect(user).toContain('R12000.00')
  })
})

// Silence unused-var lint on mock helpers only used in some tests
void vi
