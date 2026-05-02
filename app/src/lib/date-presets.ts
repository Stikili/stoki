// Date-range presets used by Reports / Invoices / any place with a date filter.
// Pure functions — tested in date-presets.test.ts.

export interface DateRange {
  from: Date
  to: Date
}

/** Today, 00:00:00 → 23:59:59. */
export function today(now: Date = new Date()): DateRange {
  const from = new Date(now); from.setHours(0, 0, 0, 0)
  const to = new Date(now); to.setHours(23, 59, 59, 999)
  return { from, to }
}

/** Yesterday, midnight to 23:59:59. */
export function yesterday(now: Date = new Date()): DateRange {
  const t = today(now)
  const from = new Date(t.from); from.setDate(from.getDate() - 1)
  const to = new Date(t.to); to.setDate(to.getDate() - 1)
  return { from, to }
}

/** Last 7 days including today (i.e. today - 6 → today). */
export function last7Days(now: Date = new Date()): DateRange {
  const t = today(now)
  const from = new Date(t.from); from.setDate(from.getDate() - 6)
  return { from, to: t.to }
}

/** Last 30 days including today. */
export function last30Days(now: Date = new Date()): DateRange {
  const t = today(now)
  const from = new Date(t.from); from.setDate(from.getDate() - 29)
  return { from, to: t.to }
}

/** First of this month → today. */
export function thisMonth(now: Date = new Date()): DateRange {
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const to = new Date(now); to.setHours(23, 59, 59, 999)
  return { from, to }
}

/** First → last day of last month. */
export function lastMonth(now: Date = new Date()): DateRange {
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  return { from, to }
}

/** First of this calendar year → today. */
export function yearToDate(now: Date = new Date()): DateRange {
  const from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
  const to = new Date(now); to.setHours(23, 59, 59, 999)
  return { from, to }
}

export type PresetKey = 'today' | 'yesterday' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'ytd'

export const PRESETS: { key: PresetKey; label: string; range: (now?: Date) => DateRange }[] = [
  { key: 'today',     label: 'Today',      range: today },
  { key: 'yesterday', label: 'Yesterday',  range: yesterday },
  { key: '7d',        label: 'Last 7d',    range: last7Days },
  { key: '30d',       label: 'Last 30d',   range: last30Days },
  { key: 'thisMonth', label: 'This month', range: thisMonth },
  { key: 'lastMonth', label: 'Last month', range: lastMonth },
  { key: 'ytd',       label: 'YTD',        range: yearToDate },
]

/** Format a Date as YYYY-MM-DD (local timezone, suitable for <input type="date">). */
export function isoDateLocal(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
