import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import {
  authoriseCron, configureVapid, fetchAllStoreIds,
  fetchAllSubscriptions, sendAndPersist,
} from '@/lib/push-helpers'
import { isQuietHours, quietHoursResponse } from '@/lib/push-quiet-hours'

/**
 * F-P-08 — New Competitor Proximity Alert.
 *
 * Monthly cron. For each store with GPS coords, queries Google Places
 * Nearby Search for the four formal-retail chains (Shoprite/Usave, Boxer,
 * Pick n Pay, Spar) within `RADIUS_M`. If a chain location is detected
 * that we haven't already alerted on for this store, pushes the notice.
 *
 * Dedup is via the alerts inbox: we look for an existing alert mentioning
 * the same place_id within the last 180 days. (We don't have a dedicated
 * `known_competitors` table — alert-based dedup is good enough at monthly
 * cadence.)
 *
 * Graceful fallback: if GOOGLE_PLACES_API_KEY isn't configured OR a store
 * has no GPS, the route silently skips that store.
 *
 * Cron schedule: 0 8 1 * * (08:00 UTC on the 1st of each month).
 */

const RADIUS_M = 2000
const ALLOWED_CHAINS = [
  'Shoprite', 'Usave', 'Boxer', 'Pick n Pay', 'Pick \'n Pay', 'Spar',
] as const

export async function POST(req: Request) {
  if (!authoriseCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isQuietHours()) return NextResponse.json(quietHoursResponse())

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ skipped: true, reason: 'no_api_key' })
  configureVapid()

  const supabase = createAdminClient()
  const subs = await fetchAllSubscriptions(supabase)
  const storeIds = await fetchAllStoreIds(supabase)
  if (storeIds.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  let evaluated = 0
  for (const storeId of storeIds) {
    const { data: store } = await supabase
      .from('stores')
      .select('lat, lng')
      .eq('id', storeId)
      .maybeSingle()
    if (!store?.lat || !store?.lng) continue
    evaluated++

    const competitors = await fetchNearbyChains(Number(store.lat), Number(store.lng), apiKey)
    if (competitors.length === 0) continue

    // Dedup: filter out competitors we've already alerted about in the last 180 days.
    const sixMonthsAgo = new Date(); sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180)
    const fresh: typeof competitors = []
    for (const c of competitors) {
      const { data: prior } = await supabase
        .from('alerts')
        .select('id')
        .eq('store_id', storeId)
        .ilike('message', `%${c.placeId}%`)
        .gte('created_at', sixMonthsAgo.toISOString())
        .limit(1)
      if ((prior ?? []).length === 0) fresh.push(c)
    }
    if (fresh.length === 0) continue

    // Surface the closest fresh competitor.
    const closest = fresh.sort((a, b) => a.distanceM - b.distanceM)[0]
    const distKm = (closest.distanceM / 1000).toFixed(1)
    const body = `A new ${closest.chain} opened ${distKm}km away. They overlap with your top sellers — your edge is hours, credit, and convenience. Tap for the playbook.`

    const result = await sendAndPersist(
      supabase, storeId, subs,
      { title: '🚨 New competitor nearby', body, url: '/advisor?topic=competition' },
      'ai_insight',
      `New competitor: ${closest.chain} ${distKm}km away [place_id:${closest.placeId}].`,
    )
    sent += result.sent
  }

  return NextResponse.json({ sent, evaluated })
}

export async function GET(req: Request) { return POST(req) }

interface NearbyCompetitor {
  chain: string
  placeId: string
  distanceM: number
}

interface PlacesResult {
  place_id: string
  name: string
  geometry?: { location?: { lat: number; lng: number } }
}

async function fetchNearbyChains(
  lat: number, lng: number, apiKey: string,
): Promise<NearbyCompetitor[]> {
  try {
    // Single Nearby Search query for "supermarket" within radius. Filter
    // results to known SA chains client-side rather than running per-chain
    // text-search queries (saves API spend).
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${RADIUS_M}&type=supermarket&key=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return []
    const data = await res.json() as { results?: PlacesResult[] }
    const out: NearbyCompetitor[] = []
    for (const r of data.results ?? []) {
      const matched = ALLOWED_CHAINS.find(c => r.name.toLowerCase().includes(c.toLowerCase()))
      if (!matched) continue
      const ll = r.geometry?.location
      const distance = ll ? haversineMeters(lat, lng, ll.lat, ll.lng) : RADIUS_M
      out.push({ chain: matched, placeId: r.place_id, distanceM: distance })
    }
    return out
  } catch {
    return []
  }
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
