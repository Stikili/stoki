import { describe, expect, it } from 'vitest'
import { Invoice, balanceOf, isOverdue, daysOverdue } from './invoice'

const baseInvoice: Invoice = {
  id: 'inv1',
  storeId: 's1',
  customerId: 'c1',
  customerName: 'ACME',
  invoiceNumber: 1,
  status: 'sent',
  issuedAt: '2026-04-01T00:00:00Z',
  dueAt: '2026-05-01T00:00:00Z',
  lineItems: [],
  subtotalExcl: 100,
  vatAmount: 15,
  total: 115,
  amountPaid: 0,
  notes: null,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
}

describe('balanceOf', () => {
  it('returns total when nothing is paid', () => {
    expect(balanceOf(baseInvoice)).toBe(115)
  })

  it('returns total minus amount paid', () => {
    expect(balanceOf({ ...baseInvoice, amountPaid: 50 })).toBe(65)
  })

  it('returns 0 (not negative) when overpaid', () => {
    expect(balanceOf({ ...baseInvoice, amountPaid: 200 })).toBe(0)
  })

  it('returns 0 when fully paid', () => {
    expect(balanceOf({ ...baseInvoice, amountPaid: 115 })).toBe(0)
  })
})

describe('isOverdue', () => {
  const NOW = new Date('2026-05-15T00:00:00Z')

  it('is overdue when due date is in the past and balance > 0', () => {
    expect(isOverdue(baseInvoice, NOW)).toBe(true)
  })

  it('is not overdue when due date is in the future', () => {
    const future = { ...baseInvoice, dueAt: '2026-06-01T00:00:00Z' }
    expect(isOverdue(future, NOW)).toBe(false)
  })

  it('is not overdue when paid in full, even past due', () => {
    const paid = { ...baseInvoice, status: 'paid' as const, amountPaid: 115 }
    expect(isOverdue(paid, NOW)).toBe(false)
  })

  it('is not overdue when cancelled', () => {
    const cancelled = { ...baseInvoice, status: 'cancelled' as const }
    expect(isOverdue(cancelled, NOW)).toBe(false)
  })

  it('is not overdue when fully settled (balance 0) but still status=sent', () => {
    // Edge case: paid in full but status not yet flipped — balance == 0 means
    // there's nothing to be overdue on.
    const settled = { ...baseInvoice, amountPaid: 115 }
    expect(isOverdue(settled, NOW)).toBe(false)
  })
})

describe('daysOverdue', () => {
  it('counts the days since due date', () => {
    const now = new Date('2026-05-15T00:00:00Z')
    // due 2026-05-01 → 14 days overdue
    expect(daysOverdue(baseInvoice, now)).toBe(14)
  })

  it('returns negative for not-yet-due invoices', () => {
    const now = new Date('2026-04-15T00:00:00Z')
    // due 2026-05-01 → 16 days until due
    expect(daysOverdue(baseInvoice, now)).toBe(-16)
  })
})
