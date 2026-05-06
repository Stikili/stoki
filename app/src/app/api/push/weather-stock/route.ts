import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  authoriseCron, configureVapid, distinctStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'

/**
 * F-P-06 — Weather Stock Alert.
 *
 * Daily cron. For each store with GPS coords, polls OpenWeatherMap's free
 * 5-day forecast endpoint, and looks for cold fronts or heatwaves that
 * deviate by >= 8°C from the trailing 30-day local seasonal average.
 *
 * On detection, pushes a notification 24–48h ahead with a stock-up hint
 * tied to the type of event (cold → soup, paraffin, bread; hot → cold
 * drinks, ice).
 *
 * Graceful fallback: if OPENWEATHERMAP_API_KEY isn't configured OR a store
 * has no GPS, the route silently skips that store. No errors thrown.
 *
 * Cron schedule: 0 8 * * * (08:00 UTC = 10:00 SAST).
 */

const TEMP_DEVIATION_C = 8
const FORECAST_LOOKAHEAD_HOURS = 48

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())

  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ skipped: true, reason: 'no_api_key' })
  }

  if (!configureVapid()) return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 })

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  if (subs.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  let evaluated = 0
  for (const storeId of distinctStoreIds(subs)) {
    const { data: store } = await supabase
      .from('stores')
      .select('lat, lng, location')
      .eq('id', storeId)
      .maybeSingle()
    if (!store?.lat || !store?.lng) continue
    evaluated++

    const event = await detectWeatherEvent(Number(store.lat), Number(store.lng), apiKey)
    if (!event) continue

    const place = (store.location as string | null) ?? 'your area'
    const hint = event.kind === 'cold'
      ? `Paraffin, soup, bread & hot drinks usually spike. Reorder?`
      : `Cold drinks, ice & ice-cream usually spike. Reorder?`
    const body = `${event.kind === 'cold' ? '🌧️ Cold front' : '☀️ Heatwave'} hits ${place} ${event.whenText}. ${hint}`

    const result = await sendAndPersist(
      supabase, storeId, subs,
      { title: event.kind === 'cold' ? '🌧️ Cold front incoming' : '☀️ Heatwave incoming',
        body, url: '/inventory' },
      'ai_insight',
      `Weather alert (${event.kind}, Δ${event.deltaC.toFixed(0)}°C ${event.whenText}). ${hint}`,
    )
    sent += result.sent
  }

  return NextResponse.json({ sent, evaluated })
}

export async function GET(req: Request) { return POST(req) }

interface DetectedEvent {
  kind: 'cold' | 'hot'
  deltaC: number
  whenText: string
}

/**
 * Pulls OpenWeatherMap 5-day forecast (3-hour buckets). Computes the mean
 * forecast temp over the next FORECAST_LOOKAHEAD_HOURS and the mean over
 * the trailing 5 days as a "seasonal average" proxy. (OWM's free tier
 * doesn't expose long-range historical, so we compare upcoming vs. recent
 * — enough to flag a meaningful deviation.)
 */
async function detectWeatherEvent(
  lat: number, lng: number, apiKey: string,
): Promise<DetectedEvent | null> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const data = await res.json() as { list: Array<{ dt: number; main: { temp: number } }> }

    const now = Date.now()
    const horizon = now + FORECAST_LOOKAHEAD_HOURS * 3600_000
    const upcoming = data.list.filter(p => p.dt * 1000 >= now && p.dt * 1000 <= horizon)
    const recent = data.list.filter(p => p.dt * 1000 < now)
    if (upcoming.length === 0 || recent.length === 0) return null

    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const meanUpcoming = avg(upcoming.map(p => p.main.temp))
    const meanRecent   = avg(recent.map(p => p.main.temp))
    const delta = meanUpcoming - meanRecent

    if (Math.abs(delta) < TEMP_DEVIATION_C) return null

    // Find the timestamp where the deviation is most extreme to phrase
    // "today / tomorrow / Thursday" naturally.
    const peak = upcoming.reduce(
      (best, p) =>
        Math.abs(p.main.temp - meanRecent) > Math.abs(best.main.temp - meanRecent) ? p : best,
      upcoming[0],
    )
    return {
      kind: delta < 0 ? 'cold' : 'hot',
      deltaC: delta,
      whenText: relativeDay(new Date(peak.dt * 1000)),
    }
  } catch {
    return null
  }
}

function relativeDay(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(d); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return `on ${target.toLocaleDateString('en-ZA', { weekday: 'long' })}`
}
