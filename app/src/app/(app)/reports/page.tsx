import { getServerData } from '@/lib/getServerData'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { RestockRepository } from '@/infrastructure/supabase/repositories/RestockRepository'
import { FixedAssetRepository } from '@/infrastructure/supabase/repositories/FixedAssetRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { SupplierBillRepository } from '@/infrastructure/supabase/repositories/SupplierBillRepository'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'
import { buildBalanceSheet } from '@/lib/balance-sheet'
import RestrictedNotice from '@/components/RestrictedNotice'
import ReportsClient from './ReportsClient'

interface SearchParamsRaw { from?: string; to?: string }

export default async function ReportsPage(props: { searchParams: Promise<SearchParamsRaw> }) {
  const { supabase, store, role } = await getServerData()

  // Reports expose profit, costs and margins — manager / owner only.
  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Reports are restricted"
        description="P&L, VAT and sales detail are available to managers and the store owner."
      />
    )
  }

  const params = await props.searchParams
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const defaultTo = new Date(now); defaultTo.setHours(23, 59, 59, 999)

  const from = params.from ? new Date(params.from + 'T00:00:00') : defaultFrom
  const to = params.to ? new Date(params.to + 'T23:59:59') : defaultTo

  const saleRepo = new SaleRepository(supabase)
  const expenseRepo = new ExpenseRepository(supabase)
  const restockRepo = new RestockRepository(supabase)
  const assetRepo = new FixedAssetRepository(supabase)
  const invoiceRepo = new InvoiceRepository(supabase)
  const billRepo = new SupplierBillRepository(supabase)

  const [
    sales, expenses, restocks, products, depreciationTotal,
    openInvoices, debtors, openBills, allAssets,
  ] = await Promise.all([
    saleRepo.findByPeriod(store.id, from, to),
    expenseRepo.findByPeriod(store.id, from, to),
    restockRepo.findByPeriod(store.id, from, to).catch(() => []),
    getCachedProducts(store.id).catch(() => []),
    assetRepo.sumByPeriod(store.id, from, to).catch(() => 0),
    invoiceRepo.findOpen(store.id).catch(() => []),
    getCachedDebtors(store.id).catch(() => []),
    billRepo.findOpen(store.id).catch(() => []),
    assetRepo.findAll(store.id).catch(() => []),
  ])

  // Position snapshot — point-in-time, anchored to `to`. Owner can scrub the
  // date range to see "what did I own/owe on 28 Feb?" for year-end purposes.
  const balanceSheet = buildBalanceSheet({
    asOf: to,
    cashBalance: store.cashBalance,
    products,
    openInvoices,
    debtors,
    openBills,
    assets: allAssets,
  })

  return (
    <div className="px-4 pt-6 pb-4">
      <ReportsClient
        store={store}
        sales={sales}
        expenses={expenses}
        restocks={restocks}
        products={products}
        depreciationTotal={depreciationTotal}
        balanceSheet={JSON.parse(JSON.stringify(balanceSheet))}
        from={isoDate(from)}
        to={isoDate(to)}
      />
    </div>
  )
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
