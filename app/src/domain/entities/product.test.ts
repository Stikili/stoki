import { describe, expect, it } from 'vitest'
import { getStockStatus, withStatus, daysUntilExpiry, isExpiringSoon } from './product'

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
    isAirtime: false,
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

describe('daysUntilExpiry', () => {
  const NOW = new Date('2026-05-01T00:00:00Z')

  it('returns null when product has no expiry date', () => {
    expect(daysUntilExpiry({ expiryDate: null }, NOW)).toBeNull()
  })

  it('returns positive days when expiry is in the future', () => {
    expect(daysUntilExpiry({ expiryDate: '2026-05-08T00:00:00Z' }, NOW)).toBe(7)
  })

  it('returns 0 when expiry is exactly today', () => {
    expect(daysUntilExpiry({ expiryDate: '2026-05-01T00:00:00Z' }, NOW)).toBe(0)
  })

  it('returns negative days when product has already expired', () => {
    expect(daysUntilExpiry({ expiryDate: '2026-04-25T00:00:00Z' }, NOW)).toBe(-6)
  })
})

describe('isExpiringSoon', () => {
  const NOW = new Date('2026-05-01T00:00:00Z')

  it('returns false when no expiry date', () => {
    expect(isExpiringSoon({ expiryDate: null }, 7, NOW)).toBe(false)
  })

  it('returns true within the default 7-day window', () => {
    expect(isExpiringSoon({ expiryDate: '2026-05-05T00:00:00Z' }, 7, NOW)).toBe(true)
    expect(isExpiringSoon({ expiryDate: '2026-05-08T00:00:00Z' }, 7, NOW)).toBe(true)
  })

  it('returns false when beyond the window', () => {
    expect(isExpiringSoon({ expiryDate: '2026-05-15T00:00:00Z' }, 7, NOW)).toBe(false)
  })

  it('returns true for already-expired products', () => {
    expect(isExpiringSoon({ expiryDate: '2026-04-25T00:00:00Z' }, 7, NOW)).toBe(true)
  })

  it('honours a custom window', () => {
    expect(isExpiringSoon({ expiryDate: '2026-05-15T00:00:00Z' }, 14, NOW)).toBe(true)
    expect(isExpiringSoon({ expiryDate: '2026-05-15T00:00:00Z' }, 3, NOW)).toBe(false)
  })
})
