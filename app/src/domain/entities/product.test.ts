import { describe, expect, it } from 'vitest'
import { getStockStatus, withStatus, daysUntilExpiry, isExpiringSoon, formatQty, qtyStep, Product } from './product'

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
  const baseProduct: Product = {
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
    isBundle: false,
    isWeighable: false,
    unitLabel: 'each',
    vatCode: 'standard',
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

describe('formatQty', () => {
  it('shows piece-good qtys as bare integers', () => {
    expect(formatQty(12, { isWeighable: false, unitLabel: 'each' })).toBe('12')
    expect(formatQty(0, { isWeighable: false, unitLabel: 'each' })).toBe('0')
  })

  it('shows weighable qtys with the unit label', () => {
    expect(formatQty(1.5, { isWeighable: true, unitLabel: 'kg' })).toBe('1.500 kg')
    expect(formatQty(2, { isWeighable: true, unitLabel: 'kg' })).toBe('2.000 kg')
  })

  it('auto-converts <1 kg to grams for readability', () => {
    expect(formatQty(0.25, { isWeighable: true, unitLabel: 'kg' })).toBe('250g')
    expect(formatQty(0.005, { isWeighable: true, unitLabel: 'kg' })).toBe('5g')
  })

  it('auto-converts <1 L to ml for readability', () => {
    expect(formatQty(0.5, { isWeighable: true, unitLabel: 'l' })).toBe('500ml')
  })

  it('skips the auto-convert when qty >= 1', () => {
    expect(formatQty(1.0, { isWeighable: true, unitLabel: 'kg' })).toBe('1.000 kg')
    expect(formatQty(1.5, { isWeighable: true, unitLabel: 'l' })).toBe('1.500 l')
  })

  it('does not auto-convert for native g / ml products (they already are small units)', () => {
    expect(formatQty(0.5, { isWeighable: true, unitLabel: 'g' })).toBe('0.500 g')
    expect(formatQty(0.5, { isWeighable: true, unitLabel: 'ml' })).toBe('0.500 ml')
  })

  it('handles isWeighable=true with unitLabel=each (defensive — UI lets owner toggle)', () => {
    expect(formatQty(3, { isWeighable: true, unitLabel: 'each' })).toBe('3')
  })

  it('shows unexpected fractional qty for piece goods with 3 decimals (data import oddity)', () => {
    expect(formatQty(2.5, { isWeighable: false, unitLabel: 'each' })).toBe('2.500')
  })
})

describe('qtyStep', () => {
  it('returns "1" for piece goods', () => {
    expect(qtyStep({ isWeighable: false, unitLabel: 'each' })).toBe('1')
  })

  it('returns "0.001" for weighables', () => {
    expect(qtyStep({ isWeighable: true, unitLabel: 'kg' })).toBe('0.001')
  })

  it('returns "1" when isWeighable=true but unit is each', () => {
    expect(qtyStep({ isWeighable: true, unitLabel: 'each' })).toBe('1')
  })
})
