import { describe, expect, it } from 'vitest'
import { lineVarianceValue, totalVarianceValue, nonZeroVarianceLines } from './stocktake'

describe('lineVarianceValue', () => {
  it('returns positive when there is found stock', () => {
    expect(lineVarianceValue({ variance: 3, costPerUnit: 12 })).toBe(36)
  })

  it('returns negative for shrinkage (counted < system)', () => {
    expect(lineVarianceValue({ variance: -2, costPerUnit: 15 })).toBe(-30)
  })

  it('returns zero when variance is zero', () => {
    expect(lineVarianceValue({ variance: 0, costPerUnit: 100 })).toBe(0)
  })
})

describe('totalVarianceValue', () => {
  it('sums variance values across lines (gains and losses net out)', () => {
    expect(
      totalVarianceValue([
        { variance: 5, costPerUnit: 10 },     // +50
        { variance: -3, costPerUnit: 15 },    // -45
        { variance: 0, costPerUnit: 99 },     // 0
      ]),
    ).toBe(5)
  })

  it('returns 0 for an empty list', () => {
    expect(totalVarianceValue([])).toBe(0)
  })
})

describe('nonZeroVarianceLines', () => {
  it('filters out lines whose count matched the system', () => {
    const lines = [
      { variance: 0 },
      { variance: -2 },
      { variance: 0 },
      { variance: 5 },
    ]
    expect(nonZeroVarianceLines(lines)).toEqual([{ variance: -2 }, { variance: 5 }])
  })

  it('preserves an empty list', () => {
    expect(nonZeroVarianceLines([])).toEqual([])
  })
})
