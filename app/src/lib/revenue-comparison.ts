// Pure helper for the dashboard's "vs last [weekday]" comparison line.
// Same-weekday-last-week is the right baseline because foot-traffic is
// strongly weekly-seasonal — a spaza shop's Saturday looks nothing like its
// Tuesday, so comparing today to yesterday is noisy and unhelpful.
//
// No I/O. Tested in revenue-comparison.test.ts.

export type RevenueComparisonKind = 'ahead' | 'behind' | 'flat' | 'no-data'

export interface RevenueComparison {
  text: string
  kind: RevenueComparisonKind
}

/**
 * Format a one-line revenue comparison between today and the same weekday a
 * week ago. Returns null when there's nothing useful to say (both days dead).
 *
 * - Both zero          → null (don't render anything)
 * - Last week zero     → "First {weekday} with sales"
 * - Today zero so far  → "R{x} last {weekday}" (signals what's possible)
 * - Within 5%          → "About the same as last {weekday}"
 * - Ahead              → "R{diff} ahead of last {weekday}"
 * - Behind             → "R{diff} behind last {weekday}"
 */
export function compareToLastWeek(
  todayRevenue: number,
  lastWeekRevenue: number,
  weekday: string,
): RevenueComparison | null {
  if (todayRevenue === 0 && lastWeekRevenue === 0) return null

  if (lastWeekRevenue === 0) {
    return { text: `First ${weekday} with sales`, kind: 'no-data' }
  }

  if (todayRevenue === 0) {
    return { text: `R${roundZAR(lastWeekRevenue)} last ${weekday}`, kind: 'no-data' }
  }

  const diff = todayRevenue - lastWeekRevenue
  const pctDiff = Math.abs(diff) / lastWeekRevenue

  // Within 5% is "the same shop trading the same way" — flag it as flat so
  // the user isn't celebrating R3 of noise as a win.
  if (pctDiff < 0.05) {
    return { text: `About the same as last ${weekday}`, kind: 'flat' }
  }

  if (diff > 0) {
    return { text: `R${roundZAR(diff)} ahead of last ${weekday}`, kind: 'ahead' }
  }
  return { text: `R${roundZAR(Math.abs(diff))} behind last ${weekday}`, kind: 'behind' }
}

/** Round to whole rand for the comparison line — cents are visual noise here.
 *  Normalises the NBSP ( ) thousands separator emitted by toLocaleString
 *  to a regular space so the rendered text copies/pastes cleanly and tests
 *  can use plain string literals. */
function roundZAR(amount: number): string {
  return Math.round(amount).toLocaleString('en-ZA').replace(/ /g, ' ')
}

/** Long weekday name in en-ZA (e.g. "Tuesday"). */
export function weekdayName(date: Date): string {
  return date.toLocaleDateString('en-ZA', { weekday: 'long' })
}
