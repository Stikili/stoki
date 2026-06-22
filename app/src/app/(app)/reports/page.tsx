import { getServerData } from '@/lib/getServerData'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'
import { getCachedReportsSnapshot } from '@/lib/cached-reports'
import { buildBalanceSheet } from '@/lib/balance-sheet'
import RestrictedNotice from '@/components/RestrictedNotice'
import ReportsClient from './ReportsClient'
import type { Sale } from '@/domain/entities/sale'
import type { Expense } from '@/domain/entities/expense'
import type { Restock } from '@/domain/entities/restock'
import type { Invoice } from '@/domain/entities/invoice'
import type { SupplierBill } from '@/domain/entities/supplier-bill'
import type { FixedAsset } from '@/domain/entities/fixed-asset'

interface SearchParamsRaw { from?: string; to?: string }

export default async function ReportsPage(props: { searchParams: Promise<SearchParamsRaw> }) {
  const { store, role } = await getServerData()

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

  // Three cached reads instead of nine fresh ones (cached-reports bundles
  // the seven period-bounded fetches; products + debtors keep their own
  // caches because they have finer-grained invalidation tags).
  const [snap, products, debtors] = await Promise.all([
    getCachedReportsSnapshot(store.id, from.toISOString(), to.toISOString()),
    getCachedProducts(store.id).catch(() => []),
    getCachedDebtors(store.id).catch(() => []),
  ])

  const sales             = JSON.parse(snap.salesJson) as Sale[]
  const expenses          = JSON.parse(snap.expensesJson) as Expense[]
  const restocks          = JSON.parse(snap.restocksJson) as Restock[]
  const depreciationTotal = snap.depreciationTotal
  const openInvoices      = JSON.parse(snap.openInvoicesJson) as Invoice[]
  const openBills         = JSON.parse(snap.openBillsJson) as SupplierBill[]
  const allAssets         = JSON.parse(snap.allAssetsJson) as FixedAsset[]

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
