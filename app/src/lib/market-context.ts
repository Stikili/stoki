/**
 * SA market-context data layer for the Stoki Insight bot.
 *
 * Returns a snapshot of indicators that materially affect a small-business
 * bottom line: SARB rates, fuel, CPI, and USD/ZAR. The bot consumes this via
 * the `get_market_context` tool so its advice can reference real numbers
 * ("petrol up R0.42/L this month — supplier deliveries will cost more")
 * instead of generic platitudes.
 *
 * Sources strategy:
 *   - FX (live)         open.er-api.com    public, no API key, ~daily cache
 *   - SARB rates        hardcoded baseline cron job can refresh later
 *   - Fuel             hardcoded baseline DoE publishes monthly
 *   - CPI              hardcoded baseline Stats SA publishes monthly
 *
 * The baselines live as constants here; updating them is a one-line change.
 * When a free API fails or hits a rate limit we fall back to the baseline so
 * the bot never stops working — it just becomes slightly stale.
 */

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
// Hardcoded baselines — May 2026.
// Easy to bump when SARB / DoE / Stats SA publish new numbers; flagged in the
// type so the bot can still refer to them by their published date.
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

/** Pull the current market snapshot. Cached for an hour to keep the bot fast
 *  and to avoid hammering the free FX API. Pass `force` to bypass the cache. */
export async function getMarketContext(force = false): Promise<MarketContext> {
  const now = Date.now()
  if (!force && cached && cached.expiresAt > now) return cached.value

  const fx = await fetchFx()
  const ctx: MarketContext = {
    asOf: new Date().toISOString(),
    rates: BASELINE.rates,
    fuel: BASELINE.fuel,
    inflation: BASELINE.inflation,
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
