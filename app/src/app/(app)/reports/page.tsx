import Link from 'next/link'
import { getServerData } from '@/lib/getServerData'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { RestockRepository } from '@/infrastructure/supabase/repositories/RestockRepository'
import ReportsClient from './ReportsClient'

interface SearchParamsRaw { from?: string; to?: string }

export default async function ReportsPage(props: { searchParams: Promise<SearchParamsRaw> }) {
  const { supabase, store, role } = await getServerData()

  // Reports expose profit, costs and margins — manager / owner only.
  if (role === 'cashier') {
    return (
      <div className="px-4 pt-12 pb-4 text-center">
        <p className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Reports are restricted</p>
        <p className="text-muted text-sm mb-6">
          P&amp;L, VAT and sales detail are available to managers and the store owner.
        </p>
        <Link href="/dashboard" className="text-brand text-sm font-semibold">← Back to dashboard</Link>
      </div>
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

  const [sales, expenses, restocks] = await Promise.all([
    saleRepo.findByPeriod(store.id, from, to),
    expenseRepo.findByPeriod(store.id, from, to),
    restockRepo.findByPeriod(store.id, from, to).catch(() => []),
  ])

  return (
    <div className="px-4 pt-6 pb-4">
      <ReportsClient
        store={store}
        sales={sales}
        expenses={expenses}
        restocks={restocks}
        from={isoDate(from)}
        to={isoDate(to)}
      />
    </div>
  )
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
