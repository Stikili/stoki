/**
 * Cached dashboard snapshot — bundles the 13-way parallel fetch the dashboard
 * page used to run on every navigation into a single cached function.
 *
 * Cached for 30s (stale tolerable for glance tiles). `new Date()` is captured
 * inside the cached function and frozen for that 30s window — cross-midnight
 * staleness is bounded by revalidate, not invalidation plumbing.
 *
 * Per-store keying: storeId is the only argument, so different stores get
 * distinct cache entries.
 *
 * Not cached here (computed per-request in the page handler): tax estimate
 * (depends on store.taxpayerType), role gating (depends on caller's role),
 * cashflow alert (depends on store.cashBalance which can change mid-cache).
 */

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { SupplierBillRepository } from '@/infrastructure/supabase/repositories/SupplierBillRepository'
import { RecurringExpenseRepository } from '@/infrastructure/supabase/repositories/RecurringExpenseRepository'
import { FixedAssetRepository } from '@/infrastructure/supabase/repositories/FixedAssetRepository'
import { getWeeklySummary } from '@/application/sales/getDailySummary'
import { taxYearStart, currentTaxYear } from '@/lib/tax/provisional'
import { TAGS } from './cache-tags'

export interface DashboardSnapshot {
  /** Snapshot time — frozen inside the cache window. */
  nowIso: string
  todaySalesJson: string
  weekSalesJson: string
  monthSalesJson: string
  monthExpenses: number
  todayCashSalesJson: string
  unreadAlertsJson: string
  weekDailyJson: string
  openInvoicesJson: string
  lastWeekSameDayJson: string
  ytdSalesJson: string
  ytdExpenses: number
  allBillsJson: string
  activeRecurringRulesJson: string
  last30Expenses: number
  ytdDepreciation: number
  employeeCount: number
}

export const getCachedDashboardSnapshot = unstable_cache(
  async (storeId: string): Promise<DashboardSnapshot> => {
    const db = createAdminClient()
    const saleRepo = new SaleRepository(db)
    const alertRepo = new AlertRepository(db)
    const expenseRepo = new ExpenseRepository(db)
    const invoiceRepo = new InvoiceRepository(db)
    const billRepo = new SupplierBillRepository(db)
    const recurringRepo = new RecurringExpenseRepository(db)
    const assetRepo = new FixedAssetRepository(db)

    const now = new Date()
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const taxYStart = taxYearStart(currentTaxYear(now))
    const lastWeekDayStart = new Date(dayStart); lastWeekDayStart.setDate(lastWeekDayStart.getDate() - 7)
    const lastWeekDayEnd   = new Date(dayEnd);   lastWeekDayEnd.setDate(lastWeekDayEnd.getDate() - 7)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000)

    const [
      todaySales,
      weekSales,
      monthSales,
      monthExpenses,
      todayCashSales,
      unreadAlerts,
      weekDaily,
      openInvoices,
      lastWeekSameDay,
      ytdSales,
      ytdExpenses,
      allBills,
      activeRecurringRules,
      last30Expenses,
      ytdDepreciation,
      employeeCountRes,
    ] = await Promise.all([
      saleRepo.summarise(storeId, dayStart, dayEnd),
      saleRepo.summarise(storeId, weekStart, dayEnd),
      saleRepo.summarise(storeId, monthStart, dayEnd),
      expenseRepo.sumByPeriod(storeId, monthStart, dayEnd),
      saleRepo.findByPeriod(storeId, dayStart, dayEnd),
      alertRepo.findUnread(storeId),
      getWeeklySummary(saleRepo, storeId),
      invoiceRepo.findOpen(storeId).catch(() => []),
      saleRepo.summarise(storeId, lastWeekDayStart, lastWeekDayEnd),
      saleRepo.summarise(storeId, taxYStart, dayEnd),
      expenseRepo.sumByPeriod(storeId, taxYStart, dayEnd),
      billRepo.findAll(storeId).catch(() => []),
      recurringRepo.findActive(storeId).catch(() => []),
      expenseRepo.sumByPeriod(storeId, thirtyDaysAgo, now),
      assetRepo.sumByPeriod(storeId, taxYStart, dayEnd).catch(() => 0),
      db.from('employees').select('id', { count: 'exact', head: true })
        .eq('store_id', storeId).is('deleted_at', null),
    ])

    // Serialise complex objects (Sale[], Invoice[], etc.) as JSON so the
    // Next cache layer can store + restore them without losing prototypes.
    // The dashboard handler re-parses on use. Numbers stay raw.
    return {
      nowIso: now.toISOString(),
      todaySalesJson:        JSON.stringify(todaySales),
      weekSalesJson:         JSON.stringify(weekSales),
      monthSalesJson:        JSON.stringify(monthSales),
      monthExpenses,
      todayCashSalesJson:    JSON.stringify(todayCashSales),
      unreadAlertsJson:      JSON.stringify(unreadAlerts),
      weekDailyJson:         JSON.stringify(weekDaily),
      openInvoicesJson:      JSON.stringify(openInvoices),
      lastWeekSameDayJson:   JSON.stringify(lastWeekSameDay),
      ytdSalesJson:          JSON.stringify(ytdSales),
      ytdExpenses,
      allBillsJson:          JSON.stringify(allBills),
      activeRecurringRulesJson: JSON.stringify(activeRecurringRules),
      last30Expenses,
      ytdDepreciation,
      employeeCount: employeeCountRes.count ?? 0,
    }
  },
  ['dashboard-snapshot'],
  { tags: [TAGS.dashboard], revalidate: 30 },
)
