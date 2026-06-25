import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { FixedAssetRepository } from '@/infrastructure/supabase/repositories/FixedAssetRepository'
import { postMonthlyDepreciation } from '@/application/assets/postMonthlyDepreciation'
import { log } from '@/lib/log'
import { rateLimitByIp } from '@/lib/rate-limit'

/**
 * Monthly cron — post depreciation entries for every active fixed asset.
 * Scheduled for the 1st of each month at 02:10 UTC (after recurring-expense
 * cron). Idempotent via the (asset_id, period_of) unique constraint.
 */
export async function POST(req: Request) {
  // Defense-in-depth: cap inbound per IP-bucket. Monthly cron — legit
  // hits are once a month per region; 10/min/IP is plenty of slack
  // while still blocking floods if CRON_SECRET ever leaks.
  const ipBlock = await rateLimitByIp(req, 'cron_post_monthly_depreciation', 10)
  if (ipBlock) return ipBlock

  if (!authorise(req)) {
    log.warn('cron.post_monthly_depreciation.unauthorized', {})
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  log.info('cron.post_monthly_depreciation.start', {})

  const supabase = createAdminClient()
  const assetRepo = new FixedAssetRepository(supabase)
  const asOf = new Date()

  // Iterate per store. We could compute store list from depreciation_entries
  // membership but fixed_assets is the canonical set.
  const { data: assetStores, error } = await supabase
    .from('fixed_assets')
    .select('store_id')
    .eq('status', 'active')
    .is('deleted_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const storeIds = [...new Set((assetStores ?? []).map((r) => r.store_id as string))]
  let totalPosted = 0
  let totalClosedOut = 0
  const perStore: { storeId: string; posted: number; closedOut: number; error?: string }[] = []

  for (const storeId of storeIds) {
    try {
      const { posted, closedOut } = await postMonthlyDepreciation(storeId, assetRepo, asOf)
      totalPosted += posted
      totalClosedOut += closedOut
      perStore.push({ storeId, posted, closedOut })
    } catch (e) {
      log.error('cron.post_monthly_depreciation.store_failed', { storeId, error: e })
      perStore.push({ storeId, posted: 0, closedOut: 0, error: errMsg(e) })
    }
  }

  log.info('cron.post_monthly_depreciation.done', {
    stores: storeIds.length,
    totalPosted,
    totalClosedOut,
    failures: perStore.filter(p => p.error).length,
  })
  return NextResponse.json({ totalPosted, totalClosedOut, stores: perStore })
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
