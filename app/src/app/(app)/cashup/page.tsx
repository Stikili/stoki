import { getServerData } from '@/lib/getServerData'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { PaymentMethod } from '@/domain/entities/sale'
import RestrictedNotice from '@/components/RestrictedNotice'
import CashUpClient from './CashUpClient'

export default async function CashUpPage() {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Cash up is restricted"
        description="The end-of-day reconciliation view is for managers and the store owner."
      />
    )
  }
  const saleRepo = new SaleRepository(supabase)
  const expenseRepo = new ExpenseRepository(supabase)

  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)

  const [sales, summary, todayExpenses] = await Promise.all([
    saleRepo.findByPeriod(store.id, dayStart, dayEnd),
    saleRepo.summarise(store.id, dayStart, dayEnd),
    expenseRepo.sumByPeriod(store.id, dayStart, dayEnd),
  ])

  // Aggregate revenue by payment method (returns subtract).
  const byMethod = {} as Record<PaymentMethod, number>
  for (const s of sales) {
    const sign = s.type === 'return' ? -1 : 1
    const value = s.priceAtSale * s.qty * sign
    byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] ?? 0) + value
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <CashUpClient
        expectedCash={byMethod.cash ?? 0}
        totalRevenue={summary.totalRevenue}
        totalProfit={summary.totalMargin}
        totalExpenses={todayExpenses}
        salesCount={summary.transactionCount}
        itemsSold={summary.itemsSold}
        byMethod={byMethod}
      />
    </div>
  )
}
