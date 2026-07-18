import { describe, expect, it } from 'vitest'
import {
  buildAnomalyPrompt,
  detectAnomalies,
  EXPENSE_SPIKE_MULT,
  MIN_MEDIAN_FOR_ALERT,
  REVENUE_HIGH_MULT,
  REVENUE_LOW_MULT,
} from './anomaly-detect'

function dailyRevBaseline(median: number, days = 30) {
  return Array.from({ length: days }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    revenue: median,
  }))
}

describe('detectAnomalies — revenue', () => {
  it('flags a crash when yesterday < 50% of 30-day median', () => {
    const anomalies = detectAnomalies(
      { date: '2026-02-01', revenue: 400, expensesByCategory: {} },
      { dailyRevenue: dailyRevBaseline(1000), expenses: [] },
    )
    expect(anomalies).toHaveLength(1)
    expect(anomalies[0].kind).toBe('revenue_crash')
    expect(anomalies[0].facts.yesterdayRevenue).toBe(400)
    expect(anomalies[0].facts.usualRevenue).toBe(1000)
  })

  it('flags a spike when yesterday > 200% of 30-day median', () => {
    const anomalies = detectAnomalies(
      { date: '2026-02-01', revenue: 2500, expensesByCategory: {} },
      { dailyRevenue: dailyRevBaseline(1000), expenses: [] },
    )
    expect(anomalies).toHaveLength(1)
    expect(anomalies[0].kind).toBe('revenue_spike')
  })

  it('does not flag when yesterday is inside the normal band', () => {
    const anomalies = detectAnomalies(
      { date: '2026-02-01', revenue: 900, expensesByCategory: {} },
      { dailyRevenue: dailyRevBaseline(1000), expenses: [] },
    )
    expect(anomalies).toHaveLength(0)
  })

  it('does not flag when the median is below the noise floor (avoid alerts on tiny numbers)', () => {
    const anomalies = detectAnomalies(
      { date: '2026-02-01', revenue: 5, expensesByCategory: {} },
      { dailyRevenue: dailyRevBaseline(MIN_MEDIAN_FOR_ALERT - 1), expenses: [] },
    )
    expect(anomalies).toHaveLength(0)
  })

  it('does not flag when baseline is thinner than the minimum', () => {
    const shortBaseline = dailyRevBaseline(1000, 3) // < 7 required
    const anomalies = detectAnomalies(
      { date: '2026-02-01', revenue: 100, expensesByCategory: {} },
      { dailyRevenue: shortBaseline, expenses: [] },
    )
    expect(anomalies).toHaveLength(0)
  })

  it('uses the multipliers as documented — exactly at the boundary is NOT flagged', () => {
    // Median 1000, boundary exactly at 500 (low) and 2000 (high) — strict <, > so boundary is safe
    const noCrash = detectAnomalies(
      { date: '2026-02-01', revenue: 1000 * REVENUE_LOW_MULT, expensesByCategory: {} },
      { dailyRevenue: dailyRevBaseline(1000), expenses: [] },
    )
    const noSpike = detectAnomalies(
      { date: '2026-02-01', revenue: 1000 * REVENUE_HIGH_MULT, expensesByCategory: {} },
      { dailyRevenue: dailyRevBaseline(1000), expenses: [] },
    )
    expect(noCrash).toHaveLength(0)
    expect(noSpike).toHaveLength(0)
  })
})

describe('detectAnomalies — expense spikes', () => {
  function catBaseline(cat: string, amountPerDay: number, days = 30) {
    return Array.from({ length: days }, (_, i) => ({
      date: `2025-12-${String(i + 1).padStart(2, '0')}`,
      category: cat,
      amount: amountPerDay,
    }))
  }

  it('flags a category spike when yesterday is > 1.5x the 60-day daily average', () => {
    const baseline = catBaseline('stock', 100, 30) // avg = 100 * 30 / 60 = 50
    const anomalies = detectAnomalies(
      { date: '2026-02-01', revenue: 0, expensesByCategory: { stock: 200 } }, // 200 > 50 * 1.5 = 75
      { dailyRevenue: [], expenses: baseline },
    )
    expect(anomalies.some(a => a.kind === 'expense_spike' && a.facts.category === 'stock')).toBe(true)
  })

  it('does not flag a category spike below the noise floor', () => {
    const baseline = catBaseline('airtime', 1, 30)
    const anomalies = detectAnomalies(
      { date: '2026-02-01', revenue: 0, expensesByCategory: { airtime: 10 } }, // < R100 floor
      { dailyRevenue: [], expenses: baseline },
    )
    expect(anomalies.some(a => a.kind === 'expense_spike')).toBe(false)
  })

  it('does not flag when category has no baseline history', () => {
    const anomalies = detectAnomalies(
      { date: '2026-02-01', revenue: 0, expensesByCategory: { rent: 1000 } },
      { dailyRevenue: [], expenses: [] }, // no rent history
    )
    expect(anomalies.some(a => a.kind === 'expense_spike')).toBe(false)
  })

  it('uses the documented multiplier — 1.5x baseline exactly is NOT flagged (strict >)', () => {
    const baseline = catBaseline('stock', 200, 60) // avg = 200
    const anomalies = detectAnomalies(
      { date: '2026-02-01', revenue: 0, expensesByCategory: { stock: 200 * EXPENSE_SPIKE_MULT } },
      { dailyRevenue: [], expenses: baseline },
    )
    expect(anomalies.some(a => a.kind === 'expense_spike')).toBe(false)
  })
})

describe('detectAnomalies — ranking + shape', () => {
  it('sorts by severity descending so callers can .slice(0, N) safely', () => {
    const results = detectAnomalies(
      { date: '2026-02-01', revenue: 100, expensesByCategory: { stock: 500 } }, // crash + expense spike
      {
        dailyRevenue: Array.from({ length: 30 }, (_, i) => ({
          date: `d${i}`, revenue: 1000,
        })),
        expenses: Array.from({ length: 30 }, (_, i) => ({
          date: `d${i}`, category: 'stock', amount: 100,
        })),
      },
    )
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results[0].severity).toBeGreaterThanOrEqual(results[results.length - 1].severity)
  })
})

describe('buildAnomalyPrompt', () => {
  const revCrash = {
    kind: 'revenue_crash' as const,
    headline: 'Yesterday was much slower than usual',
    facts: { yesterdayRevenue: 400, usualRevenue: 1000, downByPct: '60%' },
    severity: 3 as const,
  }

  it('names the tone in the system prompt so the model actually adapts', () => {
    const { system } = buildAnomalyPrompt(revCrash, 'casual')
    expect(system).toContain('"casual"')
  })

  it('embeds every fact key in the user prompt', () => {
    const { user } = buildAnomalyPrompt(revCrash, 'plain')
    expect(user).toContain('yesterdayRevenue: 400')
    expect(user).toContain('usualRevenue: 1000')
    expect(user).toContain('downByPct: 60%')
  })

  it('caps output length instruction to 1-2 sentences', () => {
    const { system } = buildAnomalyPrompt(revCrash, 'plain')
    expect(system).toMatch(/1 to 2 short sentences/i)
  })

  it('every tone produces a distinct system prompt block', () => {
    const tones = ['casual', 'plain', 'professional', 'technical'] as const
    const systems = tones.map(t => buildAnomalyPrompt(revCrash, t).system)
    expect(new Set(systems).size).toBe(tones.length)
  })
})
