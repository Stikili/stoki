import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { MarketIndicatorRepository } from '@/infrastructure/supabase/repositories/MarketIndicatorRepository'
import { fetchFxLive, _resetCacheForTests } from '@/lib/market-context'
import { fetchSarbIndicators } from '@/lib/market-sources/sarb'
import type { NewMarketIndicator } from '@/domain/entities/market-indicator'

/**
 * Daily cron — refresh the market_indicators table.
 *
 * Each fetcher returns a list of NewMarketIndicator rows OR an empty list
 * when the source isn't available (e.g. SARB site changed shape, fuel PDF
 * not yet posted, news API key missing). We append-only insert successful
 * fetches; failures are logged and the existing latest row stays the source
 * of truth on read.
 *
 * What's wired today:
 *   ✓ FX (USD/ZAR + EUR/ZAR)  — open.er-api.com, no API key
 *   ✓ SARB repo + prime       — SARB WebIndicators JSON API
 *   ✓ CPI                     — same SARB call (they publish Stats SA's figure)
 *   ⚠ Fuel prices             — no machine-readable source; owner updates
 *                               these on /settings/market after the DMRE's
 *                               monthly adjustment (first Wednesday)
 *
 * Fuel is deliberately not scraped. The obvious candidates all fail: AA.co.za
 * renders its price table client-side, and the DMRE publishes a PDF whose
 * layout changes between releases. A parser against either would break
 * silently and feed the advisor wrong numbers, which is worse than a stale
 * number the owner can see and correct. Revisit if a stable feed appears.
 */
export async function POST(req: Request) {
  if (!authorise(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const repo = new MarketIndicatorRepository(supabase)
  const out: { kind: string; ok: boolean; error?: string }[] = []
  const rows: NewMarketIndicator[] = []

  // FX — live, free, no API key.
  try {
    const fx = await fetchFxLive()
    if (fx.usdZar !== null) {
      rows.push({ kind: 'usd_zar', value: fx.usdZar, source: fx.source, measuredAt: fx.asOf.slice(0, 10) })
      out.push({ kind: 'usd_zar', ok: true })
    } else {
      out.push({ kind: 'usd_zar', ok: false, error: 'fx fetch returned null' })
    }
    if (fx.eurZar !== null) {
      rows.push({ kind: 'eur_zar', value: fx.eurZar, source: fx.source, measuredAt: fx.asOf.slice(0, 10) })
      out.push({ kind: 'eur_zar', ok: true })
    }
  } catch (e) {
    out.push({ kind: 'usd_zar', ok: false, error: errMsg(e) })
  }

  // SARB — one call covers repo, prime and CPI. Isolated in its own try so a
  // SARB outage still leaves the FX rows above committed.
  try {
    const sarbRows = await fetchSarbIndicators()
    rows.push(...sarbRows)
    for (const row of sarbRows) out.push({ kind: row.kind, ok: true })
  } catch (e) {
    // Report against every kind this source feeds, so a null-streak alert can
    // tell "SARB was down" apart from "SARB dropped the CPI field".
    for (const kind of ['sarb_repo', 'sarb_prime', 'cpi_yoy']) {
      out.push({ kind, ok: false, error: errMsg(e) })
    }
  }

  // Fuel has no reliable machine-readable source — see the note above. It
  // stays owner-maintained on /settings/market.

  if (rows.length > 0) {
    try {
      await repo.bulkInsert(rows)
    } catch (e) {
      // Don't claim success if the insert blew up — surface it in the response.
      return NextResponse.json(
        { error: errMsg(e), inserted: 0, attempted: out },
        { status: 500 },
      )
    }
  }

  // Bust the in-process cache so the next bot call sees fresh values
  // immediately rather than waiting up to an hour.
  _resetCacheForTests()

  return NextResponse.json({ inserted: rows.length, attempted: out })
}

export async function GET(req: Request) {
  return POST(req)
}

function authorise(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-vercel-cron')
  if (cronHeader) return true
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  if (authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) return true
  return false
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
