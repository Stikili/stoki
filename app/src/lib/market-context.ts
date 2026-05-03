/**
 * SA market-context data layer for the Stoki Insight bot.
 *
 * Returns a snapshot of indicators that materially affect a small-business
 * bottom line: SARB rates, fuel, CPI, and USD/ZAR. The bot consumes this via
 * the `get_market_context` tool so its advice can reference real numbers
 * ("petrol up R0.42/L this month — supplier deliveries will cost more")
 * instead of generic platitudes.
 *
 * Sources strategy (Phase 1.5):
 *   - DB-first read     market_indicators table — refreshed by the cron at
 *                       /api/cron/refresh-market AND manually overridable
 *                       on /settings/market for any indicator the cron
 *                       can't reliably scrape yet.
 *   - FX live           open.er-api.com — public, no API key, fetched on
 *                       demand; cron also writes the latest into the DB.
 *   - Hardcoded         BASELINE constants below — final fallback when the
 *     baseline           DB has nothing yet (fresh deploy, scrapers down,
 *                        whichever combination of bad luck hits).
 *
 * The bot never breaks because of a flaky upstream — worst case it becomes
 * slightly stale, with the `source` + `asOf` fields telling the user how
 * stale the data is.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { MarketIndicatorRepository } from '@/infrastructure/supabase/repositories/MarketIndicatorRepository'

const ONE_HOUR = 60 * 60 * 1000

export interface MarketContext {
  asOf: string
  rates: {
    repo: number          // SARB policy rate (%)
    prime: number         // commercial prime (repo + 3.5%)
    source: string
    asOf: string
  }
  fuel: {
    petrol95: number      // R / litre coastal
    diesel: number        // R / litre wholesale
    source: string
    asOf: string
  }
  inflation: {
    cpiYoy: number        // year-on-year %
    source: string
    asOf: string
  }
  fx: {
    usdZar: number | null
    eurZar: number | null
    source: string
    asOf: string
  }
}

// =============================================================================
// Hardcoded baselines — final fallback only. Live values come from the DB
// (refreshed by the cron) or the FX API. Update these when on a fresh deploy
// the cron hasn't yet populated the DB.
// =============================================================================
const BASELINE: Omit<MarketContext, 'asOf' | 'fx'> = {
  rates: {
    repo: 7.00,
    prime: 10.50,
    source: 'SARB MPC (baseline)',
    asOf: '2026-05-01',
  },
  fuel: {
    petrol95: 23.50,
    diesel: 21.80,
    source: 'DoE / DMRE (baseline)',
    asOf: '2026-05-01',
  },
  inflation: {
    cpiYoy: 4.5,
    source: 'Stats SA (baseline)',
    asOf: '2026-04-01',
  },
}

let cached: { value: MarketContext; expiresAt: number } | null = null

/** Pull the current market snapshot.
 *
 *  When `supabase` is passed we read the latest stored values for each
 *  indicator from the DB and only fall back to BASELINE for kinds that
 *  haven't been populated yet. Without a client we use BASELINE + live FX.
 *
 *  Cached for an hour to keep the bot fast and avoid hammering the FX API.
 *  Pass `force` to bypass the cache. */
export async function getMarketContext(
  supabase?: SupabaseClient,
  options: { force?: boolean } = {},
): Promise<MarketContext> {
  const now = Date.now()
  if (!options.force && cached && cached.expiresAt > now) return cached.value

  // DB read — best-effort, never blocks. Each kind falls back to BASELINE
  // when the row is missing OR the query fails outright.
  const stored = supabase ? await readStored(supabase) : {}

  // FX preference order: stored row > live fetch > baseline.
  const storedUsd = stored.usd_zar
  const storedEur = stored.eur_zar
  const fx: MarketContext['fx'] = storedUsd
    ? {
        usdZar: storedUsd.value,
        eurZar: storedEur?.value ?? null,
        source: storedUsd.source,
        asOf: storedUsd.asOf,
      }
    : await fetchFx()

  const ctx: MarketContext = {
    asOf: new Date().toISOString(),
    rates: pickRates(stored),
    fuel: pickFuel(stored),
    inflation: pickInflation(stored),
    fx,
  }

  cached = { value: ctx, expiresAt: now + ONE_HOUR }
  return ctx
}

/** One-line plain-English summary suitable for injecting into the bot's
 *  system prompt. Keeps the token cost minimal while still anchoring the
 *  conversation in current SA conditions. */
export function summariseMarketContext(ctx: MarketContext): string {
  const parts: string[] = []
  parts.push(`SARB repo ${ctx.rates.repo.toFixed(2)}% (prime ${ctx.rates.prime.toFixed(2)}%)`)
  parts.push(`petrol 95 R${ctx.fuel.petrol95.toFixed(2)}/L, diesel R${ctx.fuel.diesel.toFixed(2)}/L`)
  parts.push(`CPI ${ctx.inflation.cpiYoy.toFixed(1)}% YoY`)
  if (ctx.fx.usdZar !== null) parts.push(`USD/ZAR ${ctx.fx.usdZar.toFixed(2)}`)
  return `SA market snapshot (${ctx.asOf.slice(0, 10)}): ${parts.join(' · ')}.`
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

interface StoredValue { value: number; source: string; asOf: string }
type StoredKind = 'sarb_repo' | 'sarb_prime' | 'fuel_petrol_95' | 'fuel_diesel' | 'cpi_yoy' | 'usd_zar' | 'eur_zar'
type StoredMap = Partial<Record<StoredKind, StoredValue>>

async function readStored(supabase: SupabaseClient): Promise<StoredMap> {
  try {
    const repo = new MarketIndicatorRepository(supabase)
    const latest = await repo.findLatest()
    const map: StoredMap = {}
    for (const [kind, ind] of Object.entries(latest)) {
      if (!ind) continue
      map[kind as StoredKind] = {
        value: ind.value,
        source: ind.source,
        asOf: (ind.measuredAt ?? ind.fetchedAt).slice(0, 10),
      }
    }
    return map
  } catch {
    // Pre-migration-019 environments or RLS misconfig — fall through silently.
    return {}
  }
}

function pickRates(stored: StoredMap): MarketContext['rates'] {
  const repo = stored.sarb_repo
  const prime = stored.sarb_prime
  if (repo) {
    return {
      repo: repo.value,
      prime: prime?.value ?? Number((repo.value + 3.5).toFixed(2)),
      source: repo.source,
      asOf: repo.asOf,
    }
  }
  return BASELINE.rates
}

function pickFuel(stored: StoredMap): MarketContext['fuel'] {
  const p = stored.fuel_petrol_95
  const d = stored.fuel_diesel
  if (p && d) {
    return { petrol95: p.value, diesel: d.value, source: p.source, asOf: p.asOf }
  }
  return BASELINE.fuel
}

function pickInflation(stored: StoredMap): MarketContext['inflation'] {
  const cpi = stored.cpi_yoy
  if (cpi) return { cpiYoy: cpi.value, source: cpi.source, asOf: cpi.asOf }
  return BASELINE.inflation
}

/** Live USD/ZAR + EUR/ZAR via open.er-api.com. Used by the cron to seed
 *  the DB on schedule and by getMarketContext as a fallback. */
export async function fetchFxLive(): Promise<MarketContext['fx']> {
  return fetchFx()
}

async function fetchFx(): Promise<MarketContext['fx']> {
  // Public, no-API-key endpoint with a generous free tier. We only need the
  // mid rate and 24h staleness is fine. Anything more accurate or more
  // frequent (live ticks, bid/ask) would justify a paid feed.
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 }, // Next data-cache layer reuses across requests
    })
    if (!res.ok) throw new Error(`FX status ${res.status}`)
    const data = (await res.json()) as { result: string; rates?: Record<string, number>; time_last_update_utc?: string }
    if (data.result !== 'success' || !data.rates) throw new Error('FX payload malformed')
    const usdZar = data.rates.ZAR ?? null
    const eurZar = data.rates.ZAR && data.rates.EUR ? data.rates.ZAR / data.rates.EUR : null
    return {
      usdZar: usdZar ? Number(usdZar.toFixed(2)) : null,
      eurZar: eurZar ? Number(eurZar.toFixed(2)) : null,
      source: 'open.er-api.com',
      asOf: data.time_last_update_utc ?? new Date().toISOString(),
    }
  } catch {
    // Fall through to a sane stale baseline so the bot never breaks because
    // of a flaky third-party. The bot will mention "fx data unavailable" if
    // asked specifically about FX in a way it can't satisfy.
    return {
      usdZar: 18.40,
      eurZar: 19.85,
      source: 'baseline (fx fetch failed)',
      asOf: '2026-05-01',
    }
  }
}

// Internal — exported only for tests so we can reset cache between runs.
export function _resetCacheForTests() {
  cached = null
}
