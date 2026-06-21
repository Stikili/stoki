import { getServerData } from '@/lib/getServerData'
import { FixedAssetRepository } from '@/infrastructure/supabase/repositories/FixedAssetRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import LockedFeatureNotice from '@/components/LockedFeatureNotice'
import { hasFeature } from '@/lib/plan-gates'
import AssetsClient from './AssetsClient'
import { monthlyDepreciation, bookValue } from '@/domain/entities/fixed-asset'

export default async function AssetsPage() {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Asset register is restricted"
        description="Fixed assets and depreciation are available to managers and the store owner."
      />
    )
  }
  if (!hasFeature(store, 'assets.manage')) {
    return <LockedFeatureNotice gate="assets.manage" />
  }

  const repo = new FixedAssetRepository(supabase)
  const assets = await repo.findAll(store.id).catch(() => [])
  const now = new Date()

  // Precompute book values + monthly charges server-side so the client
  // stays focused on rendering and interaction.
  const decorated = assets.map((a) => ({
    asset: a,
    monthly: monthlyDepreciation(a),
    book: bookValue(a, now),
  }))

  // Aggregate header — total cost in register, total book value, monthly charge.
  const activeOnly = decorated.filter((d) => d.asset.status === 'active')
  const totalCost = activeOnly.reduce((s, d) => s + d.asset.cost, 0)
  const totalBook = activeOnly.reduce((s, d) => s + d.book, 0)
  const monthlyCharge = activeOnly.reduce((s, d) => s + d.monthly, 0)

  return (
    <div className="px-4 pt-6 pb-4">
      <AssetsClient
        assets={decorated.map(d => ({
          ...d.asset,
          monthly: d.monthly,
          book: d.book,
        }))}
        totalCost={totalCost}
        totalBook={totalBook}
        monthlyCharge={monthlyCharge}
      />
    </div>
  )
}
