import { describe, expect, it } from 'vitest'
import { Debtor, isOverdue } from './debtor'

const FIFTEEN_DAYS_AGO = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

// `isOverdue` measures from `createdAt` (when the debt opened), not updatedAt.
const baseDebtor: Debtor = {
  id: 'd1',
  storeId: 's1',
  name: 'Mr Test',
  phone: null,
  totalOwed: 100,
  lastRemindedAt: null,
  createdAt: TWO_DAYS_AGO,
  updatedAt: TWO_DAYS_AGO,
}

describe('debtor.isOverdue', () => {
  it('is not overdue when balance is zero (regardless of age)', () => {
    const paid = { ...baseDebtor, totalOwed: 0, createdAt: FIFTEEN_DAYS_AGO }
    expect(isOverdue(paid)).toBe(false)
  })

  it('is overdue when balance > 0 and createdAt older than the default 14-day threshold', () => {
    const overdue = { ...baseDebtor, createdAt: FIFTEEN_DAYS_AGO }
    expect(isOverdue(overdue)).toBe(true)
  })

  it('is not overdue when createdAt is recent', () => {
    expect(isOverdue(baseDebtor)).toBe(false)
  })

  it('honours a custom threshold', () => {
    // 1-day threshold — debt 2 days old counts as overdue
    expect(isOverdue(baseDebtor, 1)).toBe(true)
  })
})
