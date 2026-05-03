import { describe, expect, it } from 'vitest'
import { summariseMarketContext, type MarketContext } from './market-context'

const ctx: MarketContext = {
  asOf: '2026-05-03T10:00:00Z',
  rates:     { repo: 7.00, prime: 10.50, source: 'SARB MPC',        asOf: '2026-05-01' },
  fuel:      { petrol95: 23.50, diesel: 21.80, source: 'DMRE',      asOf: '2026-05-01' },
  inflation: { cpiYoy: 4.5,                        source: 'Stats SA', asOf: '2026-04-01' },
  fx:        { usdZar: 18.42, eurZar: 19.83, source: 'open.er-api', asOf: '2026-05-03' },
}

describe('summariseMarketContext', () => {
  it('produces a single-line summary suitable for a system prompt', () => {
    const out = summariseMarketContext(ctx)
    expect(out.startsWith('SA market snapshot (2026-05-03):')).toBe(true)
    expect(out.includes('SARB repo 7.00% (prime 10.50%)')).toBe(true)
    expect(out.includes('petrol 95 R23.50/L, diesel R21.80/L')).toBe(true)
    expect(out.includes('CPI 4.5% YoY')).toBe(true)
    expect(out.includes('USD/ZAR 18.42')).toBe(true)
  })

  it('omits FX when usdZar is null (fetch failed and no fallback supplied)', () => {
    const noFx: MarketContext = {
      ...ctx,
      fx: { ...ctx.fx, usdZar: null, eurZar: null, source: 'unavailable' },
    }
    expect(summariseMarketContext(noFx).includes('USD/ZAR')).toBe(false)
  })

  it('formats numbers consistently regardless of locale', () => {
    // toFixed gives us '.' as the decimal separator regardless of the runner's
    // locale — important because the prompt is shipped to a model that expects
    // canonical formatting.
    expect(summariseMarketContext(ctx).includes('SARB repo 7.00%')).toBe(true)
    expect(summariseMarketContext(ctx).includes('R23.50/L')).toBe(true)
  })
})
