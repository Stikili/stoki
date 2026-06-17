import { FixedAssetRepository } from '@/infrastructure/supabase/repositories/FixedAssetRepository'
import {
  endOfMonth, monthlyDepreciation,
} from '@/domain/entities/fixed-asset'

/**
 * Post one depreciation entry per active asset for the month containing
 * `asOf`. Period date is the last day of that month so it sorts cleanly
 * and the unique (asset_id, period_of) constraint prevents duplicate
 * posting if the cron fires twice in a single month.
 *
 * Marks an asset 'fully_depreciated' once accumulated reaches the
 * depreciable base (cost − residual). That status freezes further entries
 * so monthly cron stays a cheap no-op for old assets.
 */
export async function postMonthlyDepreciation(
  storeId: string,
  assetRepo: FixedAssetRepository,
  asOf: Date,
): Promise<{ posted: number; closedOut: number }> {
  const active = await assetRepo.findActive(storeId)
  const periodDate = endOfMonth(asOf)
  const periodIso = periodDate.toISOString().slice(0, 10)
  let posted = 0
  let closedOut = 0

  for (const asset of active) {
    const monthly = monthlyDepreciation(asset)
    if (monthly <= 0) continue

    // Don't post past the purchase month.
    if (new Date(asset.purchaseDate) > endOfMonth(asOf)) continue

    const before = await assetRepo.accumulatedForAsset(storeId, asset.id)
    const base = Math.max(0, asset.cost - asset.residualValue)
    if (before >= base) {
      await assetRepo.updateStatus(storeId, asset.id, 'fully_depreciated')
      closedOut++
      continue
    }

    // Clamp the last month so total accumulated lands exactly on `base`.
    const charge = Math.min(monthly, base - before)
    const { inserted } = await assetRepo.insertEntry(storeId, asset.id, periodIso, charge)
    if (inserted) posted++

    if (before + charge >= base) {
      await assetRepo.updateStatus(storeId, asset.id, 'fully_depreciated')
      closedOut++
    }
  }

  return { posted, closedOut }
}
