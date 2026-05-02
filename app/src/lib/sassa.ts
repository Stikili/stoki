// SASSA (South African Social Security Agency) grant pay-date helpers.
//
// SASSA pays out monthly social grants on a fixed schedule that's predictable
// to within a day or two:
//   - Older Persons grant: 3rd of the month
//   - Disability grant:    4th of the month
//   - Children's grants:   5th of the month (CSG, Foster Care, Care Dependency)
//
// If the scheduled day falls on a Saturday, Sunday or public holiday, SASSA
// historically pays on the closest preceding business day. SMME shops near
// pay-points see 30-50% revenue spikes on these days, so surfacing the next
// pay event helps owners stock up.
//
// SASSA publishes the official schedule annually — when it deviates from the
// heuristic the user can cross-check sassa.gov.za. The pure-logic surface
// below is safe to use without internet access (offline-first).
//
// No I/O. Tested in sassa.test.ts.

export type SassaGrant = 'older_persons' | 'disability' | 'childrens'

export const SASSA_GRANT_LABELS: Record<SassaGrant, string> = {
  older_persons: 'Older Persons',
  disability:    'Disability',
  childrens:     "Children's grants",
}

const GRANT_BASE_DAY: Record<SassaGrant, number> = {
  older_persons: 3,
  disability:    4,
  childrens:     5,
}

export interface SassaPayEvent {
  /** ISO YYYY-MM-DD of the pay date (business-day-adjusted). */
  date: string
  grants: SassaGrant[]
}

/**
 * Calendar of SA public holidays that affect SASSA pay-day shifts.
 * Conservative subset — only the ones that fall on or near the 3rd-5th of
 * any month. Full SA public-holiday list isn't needed to be correct here.
 *
 * Format: "MM-DD". Year-independent; we apply the same set every year.
 * Sources: South African Public Holidays Act 36 of 1994.
 */
const FIXED_HOLIDAY_MMDD = new Set<string>([
  '01-01', // New Year's Day
  '03-21', // Human Rights Day
  '04-27', // Freedom Day
  '05-01', // Workers' Day
  '06-16', // Youth Day
  '08-09', // National Women's Day
  '09-24', // Heritage Day
  '12-16', // Day of Reconciliation
  '12-25', // Christmas Day
  '12-26', // Day of Goodwill
])

function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

function isHoliday(d: Date): boolean {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return FIXED_HOLIDAY_MMDD.has(`${mm}-${dd}`)
}

function isoDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Move `d` backward one day at a time until it's a business day.
 * SASSA pulls payments forward (not back) when the scheduled day is a
 * weekend or public holiday — beneficiaries get paid early, not late.
 */
function previousBusinessDay(d: Date): Date {
  const out = new Date(d)
  while (isWeekend(out) || isHoliday(out)) {
    out.setDate(out.getDate() - 1)
  }
  return out
}

/**
 * Resolved SASSA pay date for a given grant in a given month.
 * Year/month are 1-indexed (year=2026, month=5 → May 2026).
 */
export function payDateFor(year: number, month: number, grant: SassaGrant): Date {
  const base = new Date(year, month - 1, GRANT_BASE_DAY[grant])
  return previousBusinessDay(base)
}

/**
 * The next SASSA pay event at or after `after` (defaults to now).
 * If multiple grants happen to land on the same business day (e.g. when
 * the older-persons day is bumped earlier into the disability day), they
 * are folded into one event.
 */
export function nextSassaPayDates(after: Date = new Date(), count = 3): SassaPayEvent[] {
  const out: SassaPayEvent[] = []
  // Walk forward month by month until we have `count` future events.
  // (cursor is mutated via setMonth — the variable itself never reassigns.)
  const cursor = new Date(after.getFullYear(), after.getMonth(), 1)
  // Cap iterations defensively — 24 months ahead is plenty for any UI.
  for (let i = 0; i < 24 && out.length < count; i++) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth() + 1

    const dates: { iso: string; grant: SassaGrant }[] = (
      ['older_persons', 'disability', 'childrens'] as const
    ).map((grant) => ({
      iso: isoDate(payDateFor(year, month, grant)),
      grant,
    }))

    // Group by ISO date so collisions appear as a single event.
    const byDate = new Map<string, SassaGrant[]>()
    for (const { iso, grant } of dates) {
      const existing = byDate.get(iso) ?? []
      existing.push(grant)
      byDate.set(iso, existing)
    }

    const events: SassaPayEvent[] = [...byDate.entries()]
      .map(([date, grants]) => ({ date, grants }))
      .sort((a, b) => a.date.localeCompare(b.date))

    for (const e of events) {
      // Only include events strictly at or after `after`.
      if (new Date(`${e.date}T23:59:59`).getTime() >= after.getTime()) {
        out.push(e)
        if (out.length >= count) break
      }
    }

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return out
}

/** Whole days from `now` until `event.date`. Negative means it has passed. */
export function daysUntil(event: SassaPayEvent, now: Date = new Date()): number {
  const ms = new Date(`${event.date}T00:00:00`).getTime() - now.getTime()
  // `|| 0` strips JavaScript's negative-zero (Math.ceil of a fraction in (-1, 0)
  // returns -0, which fails strict equality with 0 in tests).
  return Math.ceil(ms / 86_400_000) || 0
}

/** Returns the upcoming event that's within `withinDays` days, if any. */
export function imminentPayEvent(
  events: SassaPayEvent[],
  withinDays = 7,
  now: Date = new Date(),
): SassaPayEvent | null {
  for (const e of events) {
    const d = daysUntil(e, now)
    if (d >= 0 && d <= withinDays) return e
  }
  return null
}

export function formatGrantList(grants: SassaGrant[]): string {
  if (grants.length === 0) return ''
  if (grants.length === 1) return SASSA_GRANT_LABELS[grants[0]]
  if (grants.length === 2) return `${SASSA_GRANT_LABELS[grants[0]]} & ${SASSA_GRANT_LABELS[grants[1]]}`
  return grants.slice(0, -1).map((g) => SASSA_GRANT_LABELS[g]).join(', ')
    + ' & ' + SASSA_GRANT_LABELS[grants[grants.length - 1]]
}
