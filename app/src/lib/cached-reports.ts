/**
 * Cached reports snapshot — bundles the period-bounded fetches that the
 * /reports page used to run on every navigation into a single cached
 * function keyed on (storeId, fromIso, toIso).
 *
 * Shares TAGS.dashboard for invalidation: any action that invalidates
 * the dashboard (every sale, expense, bill, invoice, payment, etc.)
 * also invalidates this. Saves having to maintain a parallel invalidation
 * surface; the cost is that a sale today wipes the cache entry for
 * "last March's P&L" too. Acceptable — those queries are cheap and
 * historical period queries aren't hot paths.
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
import { TAGS } from './cache-tags'

export interface ReportsSnapshot {
  salesJson: string
  expensesJson: string
  restocksJson: string
  depreciationTotal: number
  openInvoicesJson: string
  openBillsJson: string
  allAssetsJson: string
}

export const getCachedReportsSnapshot = unstable_cache(
  async (storeId: string, fromIso: string, toIso: string): Promise<ReportsSnapshot> => {
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
  },
  ['reports-snapshot'],
  { tags: [TAGS.dashboard], revalidate: 30 },
)
