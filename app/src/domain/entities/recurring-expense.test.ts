import { describe, it, expect } from 'vitest'
import { nextOccurrence, isDue, type RecurringExpense } from './recurring-expense'

describe('nextOccurrence — monthly', () => {
  it('returns this month when the day is still ahead', () => {
    const next = nextOccurrence('monthly', 25, new Date(2026, 5, 10))
    expect(next.getFullYear()).toBe(2026)
    expect(next.getMonth()).toBe(5)
    expect(next.getDate()).toBe(25)
  })

  it('rolls to next month when the day has passed', () => {
    const next = nextOccurrence('monthly', 5, new Date(2026, 5, 10))
    expect(next.getMonth()).toBe(6)
    expect(next.getDate()).toBe(5)
  })

  it('rolls to next month when the day is today', () => {
    const next = nextOccurrence('monthly', 10, new Date(2026, 5, 10))
    expect(next.getMonth()).toBe(6)
    expect(next.getDate()).toBe(10)
  })

  it('clamps day-31 to the month length in shorter months', () => {
    // From Feb 1 2026 → "day 31" → Feb 28 2026 (not leap year)
    const next = nextOccurrence('monthly', 31, new Date(2026, 1, 1))
    expect(next.getMonth()).toBe(1)
    expect(next.getDate()).toBe(28)
  })

  it('clamps day-31 in Feb of a leap year to the 29th', () => {
    const next = nextOccurrence('monthly', 31, new Date(2028, 1, 1))
    expect(next.getMonth()).toBe(1)
    expect(next.getDate()).toBe(29)
  })

  it('rolls year-end correctly', () => {
    const next = nextOccurrence('monthly', 5, new Date(2026, 11, 20))
    expect(next.getFullYear()).toBe(2027)
    expect(next.getMonth()).toBe(0)
    expect(next.getDate()).toBe(5)
  })
})

describe('nextOccurrence — weekly', () => {
  it('jumps to the next matching weekday', () => {
    // Mon 2026-06-15 → next Friday (day 5)
    const next = nextOccurrence('weekly', 5, new Date(2026, 5, 15))
    expect(next.getDay()).toBe(5)
    expect(next.getDate()).toBe(19)
  })

  it('rolls a full week when today matches the target weekday', () => {
    // Mon 2026-06-15 → next Monday should be 2026-06-22 (not today)
    const next = nextOccurrence('weekly', 1, new Date(2026, 5, 15))
    expect(next.getDay()).toBe(1)
    expect(next.getDate()).toBe(22)
  })

  it('crosses month boundaries cleanly', () => {
    // Wed 2026-06-24 → next Tuesday (day 2) should be 2026-06-30
    const next = nextOccurrence('weekly', 2, new Date(2026, 5, 24))
    expect(next.getMonth()).toBe(5)
    expect(next.getDate()).toBe(30)
  })
})

describe('isDue', () => {
  const base: RecurringExpense = {
    id: 'r1',
    storeId: 's1',
    category: 'rent',
    description: 'Shop rent',
    amount: 3000,
    isCapital: false,
    frequency: 'monthly',
    dayValue: 1,
    nextDueAt: '2026-06-01T00:00:00Z',
    lastPostedAt: null,
    active: true,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  }

  it('is due when nextDueAt <= now', () => {
    expect(isDue(base, new Date('2026-06-15T00:00:00Z'))).toBe(true)
    expect(isDue(base, new Date('2026-06-01T00:00:00Z'))).toBe(true)
  })

  it('not due when nextDueAt is in the future', () => {
    expect(isDue(base, new Date('2026-05-20T00:00:00Z'))).toBe(false)
  })

  it('inactive rules are never due', () => {
    expect(isDue({ ...base, active: false }, new Date('2026-12-01T00:00:00Z'))).toBe(false)
  })
})
