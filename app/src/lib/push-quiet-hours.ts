/**
 * Push-notification quiet-hours guard.
 *
 * SMME owners overwhelmingly run their shops in SAST (UTC+2). We hard-suppress
 * notifications between 22:00 and 06:00 SAST so a midnight cron run doesn't
 * wake people. The hours are configurable later via Settings; for now it's a
 * hard-coded window that every push route checks before firing.
 *
 * The guard is timezone-aware: the cron may run in any region, but we always
 * compute the "current hour" in Africa/Johannesburg before deciding.
 */

const SAST_TIMEZONE = 'Africa/Johannesburg'

const QUIET_START_HOUR = 22 // 22:00 SAST
const QUIET_END_HOUR = 6    // 06:00 SAST

/** Returns the current hour (0-23) in SAST, regardless of where the server is. */
export function currentHourSAST(now: Date = new Date()): number {
  // Intl.DateTimeFormat with hour12=false in SAST → "01", "13", "22", etc.
  const hourStr = new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    hour12: false,
    timeZone: SAST_TIMEZONE,
  }).format(now)
  const n = parseInt(hourStr, 10)
  // Some locales emit "24" at midnight; coerce to 0.
  return n >= 24 ? 0 : n
}

/** True between 22:00 (inclusive) and 06:00 (exclusive) SAST. */
export function isQuietHours(now: Date = new Date()): boolean {
  const h = currentHourSAST(now)
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR
}

/** Helper used by every push route — returns early when quiet. */
export function quietHoursResponse(): { skipped: true; reason: 'quiet_hours' } {
  return { skipped: true, reason: 'quiet_hours' }
}
