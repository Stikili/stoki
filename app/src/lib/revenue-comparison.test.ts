import { describe, expect, it } from 'vitest'
import { compareToLastWeek, weekdayName } from './revenue-comparison'

describe('compareToLastWeek', () => {
  it('returns null when both days have no sales', () => {
    expect(compareToLastWeek(0, 0, 'Tuesday')).toBeNull()
  })

  it('encourages a brand-new shop on its first day with sales', () => {
    expect(compareToLastWeek(150, 0, 'Tuesday')).toEqual({
      text: 'First Tuesday with sales',
      kind: 'no-data',
    })
  })

  it('shows what last week did when today has not started yet', () => {
    expect(compareToLastWeek(0, 1234, 'Tuesday')).toEqual({
      text: 'R1 234 last Tuesday',
      kind: 'no-data',
    })
  })

  it('reports ahead with whole-rand difference', () => {
    const result = compareToLastWeek(1500, 1234, 'Tuesday')
    expect(result?.kind).toBe('ahead')
    expect(result?.text).toBe('R266 ahead of last Tuesday')
  })

  it('reports behind with whole-rand difference', () => {
    const result = compareToLastWeek(1000, 1500, 'Tuesday')
    expect(result?.kind).toBe('behind')
    expect(result?.text).toBe('R500 behind last Tuesday')
  })

  it('flags differences under 5% as flat (noise)', () => {
    // 1000 vs 1030 = 3% — flat.
    const result = compareToLastWeek(1030, 1000, 'Tuesday')
    expect(result?.kind).toBe('flat')
    expect(result?.text).toBe('About the same as last Tuesday')
  })

  it('treats exactly 5% as ahead/behind (boundary kept on the meaningful side)', () => {
    // 1000 vs 1050 = exactly 5% — should NOT be flat (boundary uses <).
    expect(compareToLastWeek(1050, 1000, 'Tuesday')?.kind).toBe('ahead')
  })

  it('rounds to whole rand and formats large numbers with thin space (en-ZA)', () => {
    const result = compareToLastWeek(2300.45, 1000, 'Saturday')
    expect(result?.text).toBe('R1 300 ahead of last Saturday')
  })

  it('uses the supplied weekday verbatim', () => {
    expect(compareToLastWeek(100, 50, 'Friday')?.text).toContain('Friday')
    expect(compareToLastWeek(100, 50, 'Sunday')?.text).toContain('Sunday')
  })
})

describe('weekdayName', () => {
  it('returns the long weekday name in en-ZA', () => {
    // 2026-05-05 is a Tuesday.
    expect(weekdayName(new Date(2026, 4, 5))).toBe('Tuesday')
    // 2026-05-09 is a Saturday.
    expect(weekdayName(new Date(2026, 4, 9))).toBe('Saturday')
  })
})
