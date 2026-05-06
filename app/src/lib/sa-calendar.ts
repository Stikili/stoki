/**
 * South African operational calendar.
 *
 * Combines: cultural / holiday events, fuel-price-adjustment days, and
 * (already exported from `lib/sassa.ts`) SASSA pay-days. One place for any
 * feature that needs to know "what's coming up in SA."
 *
 * Updated annually by Stoki ops. Dates are calendar-precise (no time-of-day);
 * "days until" calculations treat them as start-of-day SAST.
 */

export type SACategoryDemandTag =
  | 'staples'         // bread, milk, sugar, oil
  | 'beverages'       // soft drinks, juice
  | 'celebration'     // braai, snacks, sweets
  | 'religious'       // dates, halaal stocks, lentils
  | 'school'          // lunchbox items, stationery
  | 'cold_weather'    // soup, paraffin, hot drinks
  | 'hot_weather'     // ice, cold drinks, ice-cream

export interface SAEvent {
  /** Stable id used for de-duping per-shop notifications. */
  id: string
  name: string
  /** ISO date string (YYYY-MM-DD). For multi-day events use start date. */
  date: string
  /** Optional end date for ranges (Ramadan, school terms). */
  endDate?: string
  /** Days before the event when stock-up advice is most useful. */
  prepLeadDays: number
  /** Tag groups telling the advisor which categories to prioritise. */
  demandTags: SACategoryDemandTag[]
  /** Plain-language stock-up hint shown to the owner. */
  hint: string
}

/**
 * 2026 calendar — replace with the rolling-window version each new year.
 * Public holidays are SA-statutory; cultural events are the most commercially
 * material ones for SMME retail.
 */
export const SA_EVENTS_2026: SAEvent[] = [
  { id: 'new-year-2026',     name: 'New Year',           date: '2026-01-01', prepLeadDays: 4, demandTags: ['celebration', 'beverages'],
    hint: 'New Year — cold drinks, snacks, braai meat sell faster from Dec 28.' },
  { id: 'human-rights-2026', name: 'Human Rights Day',   date: '2026-03-21', prepLeadDays: 3, demandTags: ['celebration', 'staples'],
    hint: 'Long weekend — stock up on staples, snacks, and cold drinks.' },
  { id: 'good-friday-2026',  name: 'Good Friday',        date: '2026-04-03', prepLeadDays: 4, demandTags: ['religious', 'celebration', 'staples'],
    hint: 'Easter weekend — fish, hot cross buns, chocolate eggs spike for 4 days.' },
  { id: 'family-day-2026',   name: 'Family Day',         date: '2026-04-06', prepLeadDays: 1, demandTags: ['celebration'],
    hint: 'Long weekend continues — keep braai meat & snacks topped up.' },
  { id: 'freedom-2026',      name: 'Freedom Day',        date: '2026-04-27', prepLeadDays: 2, demandTags: ['celebration', 'beverages'],
    hint: 'Public holiday — long weekend if it lands near a Friday/Monday.' },
  { id: 'workers-2026',      name: 'Workers Day',        date: '2026-05-01', prepLeadDays: 2, demandTags: ['celebration'],
    hint: '1 May long weekend — braai pack demand spikes.' },
  { id: 'youth-2026',        name: 'Youth Day',          date: '2026-06-16', prepLeadDays: 2, demandTags: ['celebration', 'school'],
    hint: 'Mid-June public holiday — stock cold-weather staples too.' },
  { id: 'womens-2026',       name: "Women's Day",        date: '2026-08-09', prepLeadDays: 2, demandTags: ['celebration'],
    hint: "Women's Day — long weekend if it falls Mon/Fri." },
  { id: 'heritage-2026',     name: 'Heritage Day (Braai Day)', date: '2026-09-24', prepLeadDays: 4, demandTags: ['celebration', 'beverages'],
    hint: 'Heritage Day = National Braai Day. Boerewors, charcoal, rolls, beer all spike heavily.' },
  { id: 'reconciliation-2026', name: 'Day of Reconciliation', date: '2026-12-16', prepLeadDays: 2, demandTags: ['celebration'],
    hint: 'Mid-December public holiday — start of festive shopping run.' },
  { id: 'christmas-2026',    name: 'Christmas',          date: '2026-12-25', prepLeadDays: 7, demandTags: ['celebration', 'staples', 'beverages'],
    hint: 'Christmas — biggest single demand spike of the year. Stock heavily from Dec 18.' },
  { id: 'boxing-2026',       name: 'Day of Goodwill (Boxing Day)', date: '2026-12-26', prepLeadDays: 1, demandTags: ['celebration'],
    hint: 'Boxing Day — day-after-Christmas top-ups, beverages especially.' },
  // Religious — Ramadan and Diwali approximate; refresh annually.
  { id: 'ramadan-2026',      name: 'Ramadan begins',     date: '2026-02-18', endDate: '2026-03-19', prepLeadDays: 5,
    demandTags: ['religious', 'staples'],
    hint: 'Ramadan — dates, lentils, halaal staples, samoosa pastry sell heavily through to Eid.' },
  { id: 'eid-fitr-2026',     name: 'Eid al-Fitr',        date: '2026-03-20', prepLeadDays: 3, demandTags: ['religious', 'celebration'],
    hint: 'Eid — sweet-meats, dates, small gifts spike around iftar.' },
  { id: 'diwali-2026',       name: 'Diwali',             date: '2026-11-08', prepLeadDays: 5, demandTags: ['religious', 'celebration'],
    hint: 'Diwali — sweets, lights, sparklers spike for the week leading up.' },
  // School calendar — approximate term-end dates (DBE 2026 calendar).
  { id: 'school-jan-2026',   name: 'Schools reopen (Term 1)', date: '2026-01-14', prepLeadDays: 5, demandTags: ['school', 'staples'],
    hint: 'School reopens — lunchbox staples, stationery, juice boxes all spike.' },
  { id: 'school-mar-2026',   name: 'School holiday begins (March)', date: '2026-03-25', prepLeadDays: 2, demandTags: ['school', 'celebration'],
    hint: 'March school holiday — kids at home means more snacks, ice-cream, soft drinks.' },
  { id: 'school-jun-2026',   name: 'Winter school holiday', date: '2026-06-26', prepLeadDays: 2, demandTags: ['school', 'cold_weather'],
    hint: 'Winter school holiday — soup, hot chocolate, paraffin, snacks.' },
  { id: 'school-oct-2026',   name: 'Spring school holiday', date: '2026-10-02', prepLeadDays: 2, demandTags: ['school'],
    hint: 'Spring school holiday — snacks + soft drinks pickup.' },
]

/** Returns the upcoming events within `windowDays` of `now`. Events whose
 *  prep window has already started (ie. their notification should fire now)
 *  are surfaced first. */
export function upcomingEvents(now: Date = new Date(), windowDays = 14): SAEvent[] {
  const today = startOfDay(now).getTime()
  const horizon = today + windowDays * 86_400_000
  return SA_EVENTS_2026
    .filter(e => {
      const t = startOfDay(new Date(e.date)).getTime()
      return t >= today && t <= horizon
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/** Events whose `prepLeadDays` window includes today — these are the ones a
 *  cron run would push. */
export function eventsToNotifyToday(now: Date = new Date()): SAEvent[] {
  const today = startOfDay(now).getTime()
  return SA_EVENTS_2026.filter(e => {
    const eventDay = startOfDay(new Date(e.date)).getTime()
    const leadStart = eventDay - e.prepLeadDays * 86_400_000
    return today >= leadStart && today <= eventDay
  })
}

/** True if `date` is the first Wednesday of its month — SA's monthly fuel-
 *  price adjustment day. Used by F-P-10. */
export function isFirstWednesday(date: Date): boolean {
  return date.getDay() === 3 && date.getDate() <= 7
}

/** Days from `now` until `dateIso` (SA-tz day boundary). Negative if past. */
export function daysUntil(dateIso: string, now: Date = new Date()): number {
  const target = startOfDay(new Date(dateIso)).getTime()
  const today = startOfDay(now).getTime()
  return Math.round((target - today) / 86_400_000)
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}
