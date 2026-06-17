/**
 * Recurring expense rule — spawns expense rows on schedule. The cron route
 * /api/cron/post-recurring-expenses processes due rules; /expenses also
 * posts lazily on load as a backstop when external cron is dark.
 */

export type RecurringFrequency = 'monthly' | 'weekly'

export interface RecurringExpense {
  id: string
  storeId: string
  category: string
  description: string
  amount: number
  isCapital: boolean
  frequency: RecurringFrequency
  /** Monthly → day-of-month (1-31); weekly → day-of-week (0=Sun..6=Sat). */
  dayValue: number
  nextDueAt: string
  lastPostedAt: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface NewRecurringExpense {
  category: string
  description: string
  amount: number
  isCapital?: boolean
  frequency: RecurringFrequency
  dayValue: number
}

/**
 * Compute the next occurrence after `from`. For monthly rules, day-of-month
 * 29-31 in shorter months clamps to the month's last day (Feb 30 → Feb 28/29).
 *
 * Pure — no DB, no Date.now(). Caller supplies `from` for testability.
 */
export function nextOccurrence(
  frequency: RecurringFrequency,
  dayValue: number,
  from: Date,
): Date {
  if (frequency === 'weekly') {
    // dayValue: 0=Sun .. 6=Sat. Skip ahead to the next matching weekday.
    const out = new Date(from)
    out.setHours(0, 0, 0, 0)
    const fromDow = out.getDay()
    let delta = dayValue - fromDow
    if (delta <= 0) delta += 7
    out.setDate(out.getDate() + delta)
    return out
  }

  // Monthly. Try this month's day; if it's already passed (or equal to today),
  // roll to next month. Clamp 29-31 to the month's last day where needed.
  const year = from.getFullYear()
  const month = from.getMonth()
  const candidate = monthDay(year, month, dayValue)
  if (candidate.getTime() > stripTime(from).getTime()) return candidate
  return monthDay(year, month + 1, dayValue)
}

function stripTime(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

/** Construct a Date for the given year/month/day, clamping day to month length. */
function monthDay(year: number, month: number, day: number): Date {
  // JS Date auto-rolls month overflow (month=12 → Jan next year). Use day 0
  // of the next month to get the last day of `month`.
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  const clamped = Math.min(day, lastDayOfMonth)
  return new Date(year, month, clamped)
}

/** Has this rule fallen due relative to `now`? */
export function isDue(rule: RecurringExpense, now: Date = new Date()): boolean {
  if (!rule.active) return false
  return new Date(rule.nextDueAt).getTime() <= now.getTime()
}
