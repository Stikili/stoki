import { describe, it, expect } from 'vitest'
import {
  monthlyDepreciation, monthsElapsed, bookValue, endOfMonth,
  type FixedAsset,
} from './fixed-asset'

function asset(p: Partial<FixedAsset> = {}): FixedAsset {
  return {
    id: 'a', storeId: 's', name: 'Fridge', category: 'fridge',
    cost: 12_000, residualValue: 0, usefulLifeMonths: 60,
    purchaseDate: '2026-01-01', status: 'active', disposedAt: null,
    notes: null, createdAt: '', updatedAt: '',
    ...p,
  }
}

describe('monthlyDepreciation', () => {
  it('straight-lines cost over the useful life', () => {
    expect(monthlyDepreciation({ cost: 12_000, residualValue: 0, usefulLifeMonths: 60 })).toBe(200)
  })

  it('subtracts residual from the depreciable base', () => {
    expect(monthlyDepreciation({ cost: 12_000, residualValue: 2_000, usefulLifeMonths: 60 })).toBeCloseTo(166.67, 2)
  })

  it('returns 0 when residual exceeds cost (defensive)', () => {
    expect(monthlyDepreciation({ cost: 1_000, residualValue: 2_000, usefulLifeMonths: 60 })).toBe(0)
  })
})

describe('monthsElapsed', () => {
  it('counts whole calendar months', () => {
    expect(monthsElapsed(new Date(2026, 0, 1), new Date(2026, 5, 1))).toBe(5)
  })

  it('zero when asOf precedes purchase', () => {
    expect(monthsElapsed(new Date(2026, 5, 1), new Date(2026, 0, 1))).toBe(0)
  })

  it('crosses year boundaries cleanly', () => {
    expect(monthsElapsed(new Date(2025, 11, 1), new Date(2026, 2, 1))).toBe(3)
  })
})

describe('bookValue', () => {
  it('equals cost on purchase date', () => {
    const a = asset({ purchaseDate: '2026-01-01' })
    expect(bookValue(a, new Date(2026, 0, 1))).toBe(12_000)
  })

  it('drops by monthly charge over time', () => {
    const a = asset({ purchaseDate: '2026-01-01' }) // 200/mo
    expect(bookValue(a, new Date(2026, 5, 1))).toBe(12_000 - 200 * 5)
  })

  it('clamps at residual after full life', () => {
    const a = asset({
      purchaseDate: '2026-01-01',
      cost: 12_000, residualValue: 0, usefulLifeMonths: 60,
    })
    expect(bookValue(a, new Date(2032, 0, 1))).toBe(0)
  })

  it('clamps at residual when residual > 0', () => {
    const a = asset({
      purchaseDate: '2026-01-01',
      cost: 12_000, residualValue: 2_000, usefulLifeMonths: 60,
    })
    expect(bookValue(a, new Date(2032, 0, 1))).toBe(2_000)
  })
})

describe('endOfMonth', () => {
  it('returns 28 Feb in a non-leap year', () => {
    expect(endOfMonth(new Date(2026, 1, 5)).getDate()).toBe(28)
  })

  it('returns 29 Feb in a leap year', () => {
    expect(endOfMonth(new Date(2028, 1, 5)).getDate()).toBe(29)
  })

  it('returns 31 for January', () => {
    expect(endOfMonth(new Date(2026, 0, 1)).getDate()).toBe(31)
  })
})
