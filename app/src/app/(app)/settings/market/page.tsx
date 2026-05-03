import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import { MarketIndicatorRepository } from '@/infrastructure/supabase/repositories/MarketIndicatorRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import MarketSettingsClient from './MarketSettingsClient'

export default async function MarketSettingsPage() {
  const { supabase, role } = await getServerData()

  // Only owners can edit the market values that the bot cites in its
  // advice — managers and cashiers see the placeholder.
  if (role !== 'owner') {
    return (
      <RestrictedNotice
        title="Market values are owner-only"
        description="Only the store owner can adjust the SARB / fuel / inflation values the Stoki Insight bot quotes."
      />
    )
  }

  const repo = new MarketIndicatorRepository(supabase)
  // Pre-migration-019 fallback so the page still loads if the SQL hasn't run.
  const latest = await repo.findLatest().catch(() => ({}))

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-muted text-sm">
        <ArrowLeft size={14} /> Settings
      </Link>
      <h1 className="text-xl font-bold text-white">Market values</h1>
      <p className="text-muted text-sm -mt-2">
        These values feed Stoki Insight when it cites SA economic conditions in its advice.
        The cron at <code>/api/cron/refresh-market</code> auto-refreshes FX daily; everything else can
        be updated here when SARB, DMRE or Stats SA publish new figures.
      </p>
      <MarketSettingsClient latest={latest} />
    </div>
  )
}
