import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { MarketIndicatorRepository } from '@/infrastructure/supabase/repositories/MarketIndicatorRepository'
import { fetchFxLive, _resetCacheForTests } from '@/lib/market-context'
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
 *   ⚠ SARB rates              — TODO: SARB MPC RSS scrape
 *   ⚠ Fuel prices             — TODO: DMRE / AA SA monthly drop
 *   ⚠ CPI                     — TODO: Stats SA monthly release
 *
 * The TODO sources are intentionally not auto-scraped from this commit —
 * each requires its own brittle scraper that needs ongoing maintenance.
 * The owner can manually update them on /settings/market until those
 * scrapers are written; the bot reads whichever value is freshest.
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

  // SARB / fuel / CPI scrapers go here when we wire them. Each one is its
  // own small fetcher — a failed fetcher just doesn't append a row, the
  // previous row stays as the latest. Slot left empty so the cron is
  // structurally complete and easy to extend.
  // try { rows.push(...await fetchSarbRates()) } catch (e) { out.push({ kind: 'sarb_repo', ok: false, error: errMsg(e) }) }
  // try { rows.push(...await fetchFuel()) }       catch (e) { out.push({ kind: 'fuel_petrol_95', ok: false, error: errMsg(e) }) }
  // try { rows.push(...await fetchCpi()) }        catch (e) { out.push({ kind: 'cpi_yoy', ok: false, error: errMsg(e) }) }

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
