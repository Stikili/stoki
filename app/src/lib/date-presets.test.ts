import { describe, expect, it } from 'vitest'
import {
  today,
  yesterday,
  last7Days,
  last30Days,
  thisMonth,
  lastMonth,
  yearToDate,
  isoDateLocal,
} from './date-presets'

// Pin "now" to a known mid-month date for deterministic assertions.
const NOW = new Date('2026-05-15T14:30:00')

describe('today', () => {
  it('starts at 00:00:00 and ends at 23:59:59 of the current local day', () => {
    const r = today(NOW)
    expect(r.from.getFullYear()).toBe(2026)
    expect(r.from.getMonth()).toBe(4) // May
    expect(r.from.getDate()).toBe(15)
    expect(r.from.getHours()).toBe(0)
    expect(r.from.getMinutes()).toBe(0)
    expect(r.to.getDate()).toBe(15)
    expect(r.to.getHours()).toBe(23)
    expect(r.to.getMinutes()).toBe(59)
  })
})

describe('yesterday', () => {
  it('returns the previous calendar day', () => {
    const r = yesterday(NOW)
    expect(r.from.getDate()).toBe(14)
    expect(r.to.getDate()).toBe(14)
    expect(r.from.getHours()).toBe(0)
    expect(r.to.getHours()).toBe(23)
  })

  it('crosses month boundary correctly', () => {
    const monthStart = new Date('2026-06-01T10:00:00')
    const r = yesterday(monthStart)
    expect(r.from.getMonth()).toBe(4) // May
    expect(r.from.getDate()).toBe(31)
  })
})

describe('last7Days', () => {
  it('spans today through 6 days ago (7 days inclusive)', () => {
    const r = last7Days(NOW)
    expect(r.from.getDate()).toBe(9)
    expect(r.to.getDate()).toBe(15)
  })
})

describe('last30Days', () => {
  it('spans today through 29 days ago (30 days inclusive)', () => {
    const r = last30Days(NOW)
    // May 15 - 29 days = April 16
    expect(r.from.getMonth()).toBe(3) // April
    expect(r.from.getDate()).toBe(16)
    expect(r.to.getDate()).toBe(15)
  })
})

describe('thisMonth', () => {
  it('starts on day 1 of the current month', () => {
    const r = thisMonth(NOW)
    expect(r.from.getMonth()).toBe(4)
    expect(r.from.getDate()).toBe(1)
    expect(r.from.getHours()).toBe(0)
    expect(r.to.getDate()).toBe(15)
  })
})

describe('lastMonth', () => {
  it('spans the entire previous calendar month', () => {
    const r = lastMonth(NOW)
    expect(r.from.getMonth()).toBe(3) // April
    expect(r.from.getDate()).toBe(1)
    expect(r.to.getMonth()).toBe(3) // April
    expect(r.to.getDate()).toBe(30) // 30 days in April
  })

  it('handles January wrapping to December of previous year', () => {
    const jan = new Date('2026-01-10T10:00:00')
    const r = lastMonth(jan)
    expect(r.from.getFullYear()).toBe(2025)
    expect(r.from.getMonth()).toBe(11) // December
    expect(r.to.getFullYear()).toBe(2025)
    expect(r.to.getDate()).toBe(31)
  })
})

describe('yearToDate', () => {
  it('starts on Jan 1 of the current year', () => {
    const r = yearToDate(NOW)
    expect(r.from.getMonth()).toBe(0)
    expect(r.from.getDate()).toBe(1)
    expect(r.to.getDate()).toBe(15)
  })
})

describe('isoDateLocal', () => {
  it('formats as YYYY-MM-DD in local time', () => {
    expect(isoDateLocal(new Date('2026-05-15T14:30:00'))).toBe('2026-05-15')
  })

  it('zero-pads month and day', () => {
    expect(isoDateLocal(new Date('2026-01-05T00:00:00'))).toBe('2026-01-05')
  })
})
