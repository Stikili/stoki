import { describe, expect, it } from 'vitest'
import { getStockStatus, withStatus } from './product'

describe('getStockStatus', () => {
  it('returns "out" when qty is zero or negative', () => {
    expect(getStockStatus(0, 5)).toBe('out')
    expect(getStockStatus(-1, 5)).toBe('out')
  })

  it('returns "low" when qty is at or below the reorder point', () => {
    expect(getStockStatus(5, 5)).toBe('low')
    expect(getStockStatus(3, 5)).toBe('low')
    expect(getStockStatus(1, 5)).toBe('low')
  })

  it('returns "ok" when qty is above the reorder point', () => {
    expect(getStockStatus(6, 5)).toBe('ok')
    expect(getStockStatus(100, 5)).toBe('ok')
  })

  it('handles a reorder point of 0', () => {
    expect(getStockStatus(0, 0)).toBe('out')
    expect(getStockStatus(1, 0)).toBe('ok')
  })
})

describe('withStatus', () => {
  const baseProduct = {
    id: 'p1',
    storeId: 's1',
    name: 'Bread',
    price: 20,
    cost: 15,
    qty: 10,
    reorderPoint: 5,
    sku: null,
    photoUrl: null,
    expiryDate: null,
    vatInclusive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }

  it('attaches stock status', () => {
    expect(withStatus(baseProduct).status).toBe('ok')
    expect(withStatus({ ...baseProduct, qty: 0 }).status).toBe('out')
    expect(withStatus({ ...baseProduct, qty: 4 }).status).toBe('low')
  })

  it('computes margin (price − cost)', () => {
    expect(withStatus(baseProduct).margin).toBe(5)
  })

  it('computes margin percentage', () => {
    // 5 / 20 = 25%
    expect(withStatus(baseProduct).marginPct).toBe(25)
  })

  it('returns 0% margin when price is 0 (avoids division by zero)', () => {
    const result = withStatus({ ...baseProduct, price: 0, cost: 0 })
    expect(result.marginPct).toBe(0)
  })
})
