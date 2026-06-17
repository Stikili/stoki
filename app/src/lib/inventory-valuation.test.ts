import { describe, it, expect } from 'vitest'
import { computeValuation } from './inventory-valuation'
import type { Product } from '@/domain/entities/product'

function p(overrides: Partial<Product> = {}): Product {
  return {
    id: 'x', storeId: 's', name: 'X',
    price: 20, cost: 10, qty: 5, reorderPoint: 1,
    sku: null, photoUrl: null, expiryDate: null,
    vatInclusive: true, isAirtime: false, isBundle: false,
    isWeighable: false, unitLabel: 'each', vatCode: 'standard',
    createdAt: '', updatedAt: '',
    ...overrides,
  }
}

describe('computeValuation — basics', () => {
  it('returns zero totals for an empty list', () => {
    const v = computeValuation([])
    expect(v.totalCostValue).toBe(0)
    expect(v.totalRetailValue).toBe(0)
    expect(v.lines).toEqual([])
  })

  it('sums cost × qty into totalCostValue', () => {
    const v = computeValuation([
      p({ id: 'a', cost: 10, qty: 5 }),
      p({ id: 'b', cost: 20, qty: 3 }),
    ])
    expect(v.totalCostValue).toBe(50 + 60)
  })

  it('sums price × qty into totalRetailValue', () => {
    const v = computeValuation([
      p({ id: 'a', price: 25, qty: 5 }),
      p({ id: 'b', price: 40, qty: 3 }),
    ])
    expect(v.totalRetailValue).toBe(125 + 120)
  })

  it('computes potential margin from retail minus cost', () => {
    const v = computeValuation([p({ price: 30, cost: 18, qty: 10 })])
    expect(v.totalPotentialMargin).toBe(120)
    expect(v.totalPotentialMarginPct).toBeCloseTo(40, 2)
  })
})

describe('computeValuation — exclusions', () => {
  it('skips out-of-stock products from the line list and counts them', () => {
    const v = computeValuation([
      p({ id: 'a', qty: 5 }),
      p({ id: 'b', qty: 0 }),
    ])
    expect(v.lines).toHaveLength(1)
    expect(v.outOfStockCount).toBe(1)
    expect(v.countedProductCount).toBe(1)
  })

  it('excludes bundles from totals (still appears in lines)', () => {
    const v = computeValuation([
      p({ id: 'a', cost: 10, qty: 5, isBundle: false }),
      p({ id: 'b', cost: 30, qty: 2, isBundle: true  }),
    ])
    expect(v.totalCostValue).toBe(50)
    expect(v.excludedBundleCount).toBe(1)
    expect(v.lines).toHaveLength(2)
  })

  it('treats airtime products like normal stock for valuation', () => {
    const v = computeValuation([
      p({ id: 'a', cost: 9.5, qty: 20, isAirtime: true }),
    ])
    expect(v.totalCostValue).toBe(190)
  })
})

describe('computeValuation — line sort', () => {
  it('sorts lines by costValue descending', () => {
    const v = computeValuation([
      p({ id: 'a', cost: 10, qty: 1 }),    // 10
      p({ id: 'b', cost: 50, qty: 4 }),    // 200
      p({ id: 'c', cost: 30, qty: 5 }),    // 150
    ])
    expect(v.lines.map(l => l.productId)).toEqual(['b', 'c', 'a'])
  })
})

describe('computeValuation — per-line margin', () => {
  it('marginPct is zero when retail is zero', () => {
    const v = computeValuation([p({ price: 0, cost: 10, qty: 5 })])
    expect(v.lines[0].marginPct).toBe(0)
  })

  it('marginPct = marginValue / retailValue × 100', () => {
    const v = computeValuation([p({ price: 40, cost: 30, qty: 1 })])
    expect(v.lines[0].marginPct).toBeCloseTo(25, 2)
  })
})
