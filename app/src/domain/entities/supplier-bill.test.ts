import { describe, it, expect } from 'vitest'
import {
  balanceOf, isOpen, isOverdue, daysOverdue, agingBucket, agingTotals,
  type SupplierBill,
} from './supplier-bill'

function makeBill(overrides: Partial<SupplierBill> = {}): SupplierBill {
  return {
    id: 'b1',
    storeId: 's1',
    supplierId: 'sup1',
    supplierName: 'Bidvest',
    reference: 'INV-001',
    issuedAt: '2026-05-01T00:00:00Z',
    dueAt: '2026-05-31T00:00:00Z',
    total: 1000,
    amountPaid: 0,
    notes: null,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    ...overrides,
  }
}

describe('balanceOf', () => {
  it('returns total when nothing paid', () => {
    expect(balanceOf(makeBill({ total: 500 }))).toBe(500)
  })

  it('returns the unpaid portion', () => {
    expect(balanceOf(makeBill({ total: 1000, amountPaid: 300 }))).toBe(700)
  })

  it('floors at zero (overpaid bills count as 0)', () => {
    expect(balanceOf(makeBill({ total: 100, amountPaid: 150 }))).toBe(0)
  })
})

describe('isOpen / isOverdue', () => {
  it('open when balance > 0', () => {
    expect(isOpen(makeBill({ total: 100, amountPaid: 50 }))).toBe(true)
  })

  it('not open when fully paid', () => {
    expect(isOpen(makeBill({ total: 100, amountPaid: 100 }))).toBe(false)
  })

  it('overdue when open AND past due date', () => {
    const bill = makeBill({ dueAt: '2026-05-01T00:00:00Z' })
    expect(isOverdue(bill, new Date('2026-06-01T00:00:00Z'))).toBe(true)
  })

  it('not overdue when paid even if past due date', () => {
    const bill = makeBill({ dueAt: '2026-05-01T00:00:00Z', total: 100, amountPaid: 100 })
    expect(isOverdue(bill, new Date('2026-06-01T00:00:00Z'))).toBe(false)
  })

  it('not overdue when still inside the due window', () => {
    const bill = makeBill({ dueAt: '2026-07-01T00:00:00Z' })
    expect(isOverdue(bill, new Date('2026-06-01T00:00:00Z'))).toBe(false)
  })
})

describe('daysOverdue', () => {
  it('returns positive whole days past due', () => {
    const bill = makeBill({ dueAt: '2026-05-01T00:00:00Z' })
    expect(daysOverdue(bill, new Date('2026-05-11T00:00:00Z'))).toBe(10)
  })

  it('returns negative for not-yet-due bills', () => {
    const bill = makeBill({ dueAt: '2026-06-30T00:00:00Z' })
    expect(daysOverdue(bill, new Date('2026-06-01T00:00:00Z'))).toBe(-29)
  })
})

describe('agingBucket', () => {
  const bill = makeBill({ dueAt: '2026-05-01T00:00:00Z' })

  it('current = not yet due or within 30 days overdue', () => {
    expect(agingBucket(bill, new Date('2026-04-25T00:00:00Z'))).toBe('current')
    expect(agingBucket(bill, new Date('2026-05-15T00:00:00Z'))).toBe('current')
    expect(agingBucket(bill, new Date('2026-05-31T00:00:00Z'))).toBe('current') // exactly 30 days
  })

  it('days30 = 31-60 days overdue', () => {
    expect(agingBucket(bill, new Date('2026-06-01T00:00:00Z'))).toBe('days30') // 31 days
    expect(agingBucket(bill, new Date('2026-06-30T00:00:00Z'))).toBe('days30') // 60 days
  })

  it('days60 = 61-90 days overdue', () => {
    expect(agingBucket(bill, new Date('2026-07-01T00:00:00Z'))).toBe('days60') // 61 days
    expect(agingBucket(bill, new Date('2026-07-30T00:00:00Z'))).toBe('days60') // 90 days
  })

  it('days90Plus = anything over 90 days overdue', () => {
    expect(agingBucket(bill, new Date('2026-08-01T00:00:00Z'))).toBe('days90Plus')
    expect(agingBucket(bill, new Date('2027-05-01T00:00:00Z'))).toBe('days90Plus')
  })
})

describe('agingTotals', () => {
  const now = new Date('2026-06-15T00:00:00Z')

  it('returns zero totals for empty list', () => {
    const t = agingTotals([], now)
    expect(t.total).toBe(0)
    expect(t.current).toBe(0)
    expect(t.countByBucket.current).toBe(0)
  })

  it('skips fully-paid bills', () => {
    const t = agingTotals([
      makeBill({ total: 500, amountPaid: 500, dueAt: '2026-01-01T00:00:00Z' }),
    ], now)
    expect(t.total).toBe(0)
  })

  it('sums partial-paid balances into the right bucket', () => {
    const t = agingTotals([
      makeBill({ id: 'a', total: 1000, amountPaid: 300, dueAt: '2026-06-01T00:00:00Z' }), // current (14d)
      makeBill({ id: 'b', total: 500,  amountPaid: 0,   dueAt: '2026-05-01T00:00:00Z' }), // days30 (45d)
      makeBill({ id: 'c', total: 200,  amountPaid: 0,   dueAt: '2026-04-01T00:00:00Z' }), // days60 (75d)
      makeBill({ id: 'd', total: 100,  amountPaid: 0,   dueAt: '2026-02-01T00:00:00Z' }), // days90Plus (134d)
    ], now)
    expect(t.current).toBe(700)
    expect(t.days30).toBe(500)
    expect(t.days60).toBe(200)
    expect(t.days90Plus).toBe(100)
    expect(t.total).toBe(1500)
    expect(t.countByBucket).toEqual({ current: 1, days30: 1, days60: 1, days90Plus: 1 })
  })
})
