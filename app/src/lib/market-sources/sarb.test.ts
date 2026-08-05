import { describe, it, expect } from 'vitest'
import { parseSarbHomePageRates } from './sarb'
import fixture from './__fixtures__/sarb-homepagerates.json'

/**
 * Fixture is the verbatim SARB HomePageRates payload captured 2026-08-06.
 * If SARB changes shape, these tests fail loudly rather than the cron
 * silently writing nothing for weeks.
 */
describe('parseSarbHomePageRates', () => {
  it('extracts repo, prime and CPI from the live payload shape', () => {
    const rows = parseSarbHomePageRates(fixture)

    expect(rows).toHaveLength(3)
    expect(rows.map(r => r.kind).sort()).toEqual(['cpi_yoy', 'sarb_prime', 'sarb_repo'])
  })

  it('reads the policy rate under the sarb_repo kind despite the rename', () => {
    // SARB relabelled "repo rate" to "SARB Policy Rate"; we match on the
    // stable timeseries code, so the rename must not break extraction.
    const repo = parseSarbHomePageRates(fixture).find(r => r.kind === 'sarb_repo')

    expect(repo).toBeDefined()
    expect(repo!.value).toBe(7)
    expect(repo!.measuredAt).toBe('2026-08-05')
    expect(repo!.notes).toBe('SARB Policy Rate')
  })

  it('reads prime as published rather than deriving repo + 3.5', () => {
    const prime = parseSarbHomePageRates(fixture).find(r => r.kind === 'sarb_prime')

    expect(prime!.value).toBe(10.5)
    expect(prime!.measuredAt).toBe('2026-08-05')
  })

  it('rounds CPI to one decimal and carries its own measurement date', () => {
    const cpi = parseSarbHomePageRates(fixture).find(r => r.kind === 'cpi_yoy')

    expect(cpi!.value).toBe(5)
    // CPI lags the daily rates — it must not inherit the policy-rate date.
    expect(cpi!.measuredAt).toBe('2026-06-30')
  })

  it('rounds rates to two decimals so the advisor never says "7.0000%"', () => {
    const rows = parseSarbHomePageRates([
      { TimeseriesCode: 'MMRD002A', Name: 'SARB Policy Rate', Date: '2026-08-05', Value: 7.1234 },
    ])

    expect(rows[0].value).toBe(7.12)
  })

  it('ignores indicators we do not track', () => {
    const rows = parseSarbHomePageRates(fixture)
    const notes = rows.map(r => r.notes)

    expect(notes).not.toContain('PPI')
    expect(notes).not.toContain('Sabor')
    expect(notes).not.toContain('Rand per US Dollar')
  })

  it('skips implausible values rather than poisoning the DB', () => {
    // A parser regression that yields 700 instead of 7.00 must be dropped,
    // not stored — the advisor states these numbers as fact.
    const rows = parseSarbHomePageRates([
      { TimeseriesCode: 'MMRD002A', Name: 'SARB Policy Rate', Date: '2026-08-05', Value: 700 },
      { TimeseriesCode: 'MMRD000A', Name: 'Prime lending rate', Date: '2026-08-05', Value: 10.5 },
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0].kind).toBe('sarb_prime')
  })

  it('skips non-numeric values', () => {
    const rows = parseSarbHomePageRates([
      { TimeseriesCode: 'MMRD002A', Name: 'SARB Policy Rate', Date: '2026-08-05', Value: 'n/a' },
    ])

    expect(rows).toEqual([])
  })

  it('returns empty for malformed payloads instead of throwing', () => {
    expect(parseSarbHomePageRates(null)).toEqual([])
    expect(parseSarbHomePageRates({})).toEqual([])
    expect(parseSarbHomePageRates('not json')).toEqual([])
    expect(parseSarbHomePageRates([null, undefined, 42])).toEqual([])
  })

  it('nulls an unparseable date rather than storing a bogus one', () => {
    const rows = parseSarbHomePageRates([
      { TimeseriesCode: 'MMRD002A', Name: 'SARB Policy Rate', Date: 'not-a-date', Value: 7 },
    ])

    expect(rows[0].measuredAt).toBeNull()
  })

  it('tolerates a missing Date field', () => {
    const rows = parseSarbHomePageRates([
      { TimeseriesCode: 'MMRD002A', Name: 'SARB Policy Rate', Value: 7 },
    ])

    expect(rows[0].measuredAt).toBeNull()
    expect(rows[0].value).toBe(7)
  })
})
