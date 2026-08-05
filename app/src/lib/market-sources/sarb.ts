/**
 * SARB indicator source — policy rate, prime, and headline CPI.
 *
 * The original Phase 1.6 plan was to scrape resbank.co.za HTML with cheerio.
 * That approach is dead: the rate pages render their values client-side, so
 * the served HTML contains labels and an empty table. A live probe on
 * 2026-08-06 also found the planned URL
 * (…/what-we-do/monetary-policy/repo-rate) now 404s.
 *
 * What we use instead is the SARB's own public JSON API, which is what those
 * pages call to populate themselves:
 *
 *   GET https://custom.resbank.co.za/SarbWebApi/WebIndicators/HomePageRates
 *
 * One unauthenticated call returns CPI, PPI, the policy rate, prime, bond
 * yields and the ZAR crosses, each with its own measurement date. That is
 * strictly better than three separate scrapers: it is the authoritative
 * publisher, it is structured, and it cannot break on a CSS redesign.
 *
 * Naming note: SARB now labels the policy rate "SARB Policy Rate" rather than
 * "repo rate" — the framework changed, the number is the same one the MPC
 * announces. We keep storing it under the `sarb_repo` kind because that is
 * what the rest of the app and the advisor prompt already speak.
 *
 * Prime is READ, not derived. The old plan assumed prime = repo + 3.5, which
 * has held for years but is a convention rather than a rule — and SARB has
 * published a consultation paper on retiring the prime lending rate outright.
 * Reading the published value costs nothing and stays correct if that spread
 * ever moves.
 */

import type { NewMarketIndicator } from '@/domain/entities/market-indicator'

const SARB_HOME_PAGE_RATES =
  'https://custom.resbank.co.za/SarbWebApi/WebIndicators/HomePageRates'

const SOURCE = 'SARB WebIndicators API'

/** One row of the SARB HomePageRates payload. */
export interface SarbRate {
  Name: string
  SectionId: string
  SectionName: string
  TimeseriesCode: string
  Date: string
  Value: number
  UpDown: number
  FormatNumber: string
  FormatDate: string
}

/**
 * Timeseries codes we care about, mapped to our indicator kinds.
 *
 * We match on TimeseriesCode rather than Name because the codes are stable
 * identifiers in SARB's own data warehouse, whereas display names change —
 * "repo rate" became "SARB Policy Rate" without the code MMRD002A moving.
 */
const CODE_TO_KIND = {
  MMRD002A: 'sarb_repo',   // SARB Policy Rate
  MMRD000A: 'sarb_prime',  // Prime lending rate
  CPI1000F: 'cpi_yoy',     // Headline CPI, year-on-year %
} as const

/** Sanity bounds. A parse that yields something outside these is a parse
 *  failure, not a real economic event — reject rather than poison the DB
 *  with a number the advisor will state as fact. */
const PLAUSIBLE_RANGE: Record<string, { min: number; max: number }> = {
  sarb_repo:  { min: 0, max: 30 },
  sarb_prime: { min: 0, max: 40 },
  cpi_yoy:    { min: -10, max: 60 },
}

/**
 * Pure parser — takes the decoded HomePageRates payload, returns the rows we
 * store. Separated from the fetch so it can be tested against a captured
 * fixture without touching the network.
 *
 * Unknown codes are ignored, malformed or implausible entries are skipped,
 * and a payload that yields nothing usable returns an empty array rather
 * than throwing. The caller treats an empty result as "no update today",
 * which leaves the previous stored value as the latest.
 */
export function parseSarbHomePageRates(payload: unknown): NewMarketIndicator[] {
  if (!Array.isArray(payload)) return []

  const rows: NewMarketIndicator[] = []

  for (const entry of payload as SarbRate[]) {
    if (!entry || typeof entry !== 'object') continue

    const kind = CODE_TO_KIND[entry.TimeseriesCode as keyof typeof CODE_TO_KIND]
    if (!kind) continue

    const value = Number(entry.Value)
    if (!Number.isFinite(value)) continue

    const range = PLAUSIBLE_RANGE[kind]
    if (range && (value < range.min || value > range.max)) continue

    rows.push({
      kind,
      // SARB sends 4dp on a 2dp quantity (7.0000). Round to the precision the
      // indicator is actually published at so the advisor doesn't say "7.0000%".
      value: Number(value.toFixed(kind === 'cpi_yoy' ? 1 : 2)),
      source: SOURCE,
      measuredAt: normaliseDate(entry.Date),
      notes: entry.Name ?? null,
    })
  }

  return rows
}

/**
 * Fetch + parse. Returns an empty array on any upstream failure — the cron
 * treats that as "nothing new today" and the previous stored value remains
 * the latest. Never throws for an upstream problem, so one bad source can't
 * take down the whole refresh.
 */
export async function fetchSarbIndicators(): Promise<NewMarketIndicator[]> {
  const res = await fetch(SARB_HOME_PAGE_RATES, {
    headers: { accept: 'application/json' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`SARB API status ${res.status}`)

  const payload = await res.json()
  const rows = parseSarbHomePageRates(payload)
  if (rows.length === 0) throw new Error('SARB payload contained no usable indicators')
  return rows
}

/** SARB sends ISO-ish dates already ("2026-08-05"), but be defensive: an
 *  unparseable date becomes null rather than a bogus measuredAt, since the
 *  repository falls back to fetchedAt for staleness display. */
function normaliseDate(raw: string | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}
