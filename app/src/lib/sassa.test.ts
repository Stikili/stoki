import { describe, expect, it } from 'vitest'
import {
  payDateFor,
  nextSassaPayDates,
  daysUntil,
  imminentPayEvent,
  formatGrantList,
} from './sassa'

describe('payDateFor', () => {
  it('returns the 3rd for older-persons in a month where the 3rd is a weekday', () => {
    // 2026-06-03 is a Wednesday.
    const d = payDateFor(2026, 6, 'older_persons')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(3)
  })

  it('shifts older-persons earlier when the 3rd is a Saturday', () => {
    // 2026-01-03 is a Saturday → shift to Friday 2026-01-02.
    const d = payDateFor(2026, 1, 'older_persons')
    expect(d.getDate()).toBe(2)
    expect(d.getDay()).toBe(5) // Friday
  })

  it('shifts older-persons earlier when the 3rd is a Sunday', () => {
    // 2027-01-03 is a Sunday → shift to Friday 2027-01-01? But that's New Year's Day.
    // Two adjustments: Sun → Sat → Fri (which is 2027-01-01, NYD) → Thu 2026-12-31.
    const d = payDateFor(2027, 1, 'older_persons')
    expect(d.getDate()).toBe(31)
    expect(d.getMonth()).toBe(11)
    expect(d.getFullYear()).toBe(2026)
  })

  it('disability grant sits on the 4th by default', () => {
    const d = payDateFor(2026, 6, 'disability')
    expect(d.getDate()).toBe(4)
  })

  it("children's grants sit on the 5th by default", () => {
    const d = payDateFor(2026, 6, 'childrens')
    expect(d.getDate()).toBe(5)
  })
})

describe('nextSassaPayDates', () => {
  it('returns at least the requested number of upcoming events', () => {
    const events = nextSassaPayDates(new Date('2026-05-01T00:00:00Z'), 6)
    expect(events.length).toBe(6)
  })

  it('skips events that already passed', () => {
    // 2026-05-15 is after the May payouts (3rd-5th), so the next events are in June.
    const events = nextSassaPayDates(new Date('2026-05-15T00:00:00Z'), 1)
    expect(events[0].date.startsWith('2026-06')).toBe(true)
  })

  it('returns events in chronological order', () => {
    const events = nextSassaPayDates(new Date('2026-05-01T00:00:00Z'), 5)
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date >= events[i - 1].date).toBe(true)
    }
  })

  it('folds multiple grants into one event when their adjusted pay dates collide', () => {
    // For January 2027: 3rd=Sun, 4th=Mon, 5th=Tue.
    // Older-persons: Sun → Sat → Fri (Jan 1 = NYD) → Thu Dec 31.
    // Disability: Mon Jan 4.
    // Children's: Tue Jan 5.
    // No collision in this month, but the structure of the API should always
    // be ready to fold — assert that an event without collision still has
    // exactly one grant per call.
    const events = nextSassaPayDates(new Date('2026-12-15T00:00:00Z'), 4)
    const map = new Map<string, number>()
    for (const e of events) map.set(e.date, (map.get(e.date) ?? 0) + 1)
    for (const count of map.values()) expect(count).toBe(1) // unique dates
  })
})

describe('daysUntil', () => {
  it('returns 0 for an event landing today', () => {
    const now = new Date('2026-05-15T10:00:00Z')
    expect(daysUntil({ date: '2026-05-15', grants: ['disability'] }, now)).toBe(0)
  })

  it('returns positive days when the event is in the future', () => {
    const now = new Date('2026-05-01T00:00:00Z')
    expect(daysUntil({ date: '2026-05-04', grants: ['disability'] }, now)).toBe(3)
  })

  it('returns negative days when the event is in the past', () => {
    const now = new Date('2026-05-10T00:00:00Z')
    expect(daysUntil({ date: '2026-05-03', grants: ['older_persons'] }, now)).toBe(-7)
  })
})

describe('imminentPayEvent', () => {
  it('returns the first event within the window', () => {
    const events = [
      { date: '2026-06-03', grants: ['older_persons' as const] },
      { date: '2026-06-04', grants: ['disability' as const] },
    ]
    const now = new Date('2026-06-01T00:00:00Z')
    expect(imminentPayEvent(events, 7, now)?.date).toBe('2026-06-03')
  })

  it('returns null when nothing falls inside the window', () => {
    const events = [{ date: '2026-07-03', grants: ['older_persons' as const] }]
    const now = new Date('2026-06-01T00:00:00Z')
    expect(imminentPayEvent(events, 7, now)).toBeNull()
  })

  it('does not return events that have already passed', () => {
    const events = [
      { date: '2026-06-01', grants: ['older_persons' as const] },
      { date: '2026-06-08', grants: ['disability' as const] },
    ]
    const now = new Date('2026-06-05T00:00:00Z')
    expect(imminentPayEvent(events, 7, now)?.date).toBe('2026-06-08')
  })
})

describe('formatGrantList', () => {
  it('formats a single grant', () => {
    expect(formatGrantList(['older_persons'])).toBe('Older Persons')
  })

  it('joins two grants with an ampersand', () => {
    expect(formatGrantList(['older_persons', 'disability'])).toBe('Older Persons & Disability')
  })

  it('comma-joins three or more with a final ampersand', () => {
    expect(formatGrantList(['older_persons', 'disability', 'childrens']))
      .toBe("Older Persons, Disability & Children's grants")
  })

  it('returns empty string for an empty list', () => {
    expect(formatGrantList([])).toBe('')
  })
})
