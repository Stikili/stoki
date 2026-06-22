/**
 * Cached reports snapshot — bundles the period-bounded fetches that the
 * /reports page used to run on every navigation into a single cached
 * function keyed on (storeId, fromIso, toIso).
 *
 * Shares per-store dashboard tag for invalidation: any action that calls
 * invalidateDashboard(storeId) also wipes this store's reports cache.
 * Cost: a sale today invalidates the cache entry for "last March's P&L"
 * for the same store too — acceptable since historical period queries
 * aren't hot paths and the staleness window is bounded by the 30s TTL
 * anyway.
 *
 * Per-store tag matters at multi-tenant scale: a global tag would mean
 * every store's mutations wipe every store's cache (see commit message
 * for the corresponding cached-dashboard.ts refactor).
 *
 * Pre-existing caches (`getCachedProducts`, `getCachedDebtors`) are
 * called from the page directly, not bundled here — they have their
 * own invalidation tags and finer-grained TTL.
 */

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { RestockRepository } from '@/infrastructure/supabase/repositories/RestockRepository'
import { FixedAssetRepository } from '@/infrastructure/supabase/repositories/FixedAssetRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { SupplierBillRepository } from '@/infrastructure/supabase/repositories/SupplierBillRepository'
import { dashboardTag } from './cache-tags'

export interface ReportsSnapshot {
  salesJson: string
  expensesJson: string
  restocksJson: string
  depreciationTotal: number
  openInvoicesJson: string
  openBillsJson: string
  allAssetsJson: string
}

export function getCachedReportsSnapshot(
  storeId: string, fromIso: string, toIso: string,
): Promise<ReportsSnapshot> {
  // Wrapper built per call so the tag can reference storeId — the
  // idiomatic Next 16 pattern for per-key invalidation with
  // unstable_cache (see cached-dashboard.ts for the matching write-up).
  const cached = unstable_cache(
    () => buildReportsSnapshot(storeId, fromIso, toIso),
    ['reports-snapshot', storeId, fromIso, toIso],
    { tags: [dashboardTag(storeId)], revalidate: 30 },
  )
  return cached()
}

async function buildReportsSnapshot(
  storeId: string, fromIso: string, toIso: string,
): Promise<ReportsSnapshot> {
  const db = createAdminClient()
  const saleRepo = new SaleRepository(db)
  const expenseRepo = new ExpenseRepository(db)
  const restockRepo = new RestockRepository(db)
  const assetRepo = new FixedAssetRepository(db)
  const invoiceRepo = new InvoiceRepository(db)
  const billRepo = new SupplierBillRepository(db)

  const from = new Date(fromIso)
  const to = new Date(toIso)

  const [
    sales, expenses, restocks, depreciationTotal,
    openInvoices, openBills, allAssets,
  ] = await Promise.all([
    saleRepo.findByPeriod(storeId, from, to),
    expenseRepo.findByPeriod(storeId, from, to),
    restockRepo.findByPeriod(storeId, from, to).catch(() => []),
    assetRepo.sumByPeriod(storeId, from, to).catch(() => 0),
    invoiceRepo.findOpen(storeId).catch(() => []),
    billRepo.findOpen(storeId).catch(() => []),
    assetRepo.findAll(storeId).catch(() => []),
  ])

  return {
    salesJson:        JSON.stringify(sales),
    expensesJson:     JSON.stringify(expenses),
    restocksJson:     JSON.stringify(restocks),
    depreciationTotal,
    openInvoicesJson: JSON.stringify(openInvoices),
    openBillsJson:    JSON.stringify(openBills),
    allAssetsJson:    JSON.stringify(allAssets),
  }
}
