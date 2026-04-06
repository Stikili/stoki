import { getServerData } from '@/lib/getServerData'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import CashUpClient from './CashUpClient'

export default async function CashUpPage() {
  const { supabase, store } = await getServerData()
  const saleRepo = new SaleRepository(supabase)
  const expenseRepo = new ExpenseRepository(supabase)

  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)

  const [summary, todayExpenses] = await Promise.all([
    saleRepo.summarise(store.id, dayStart, dayEnd),
    expenseRepo.sumByPeriod(store.id, dayStart, dayEnd),
  ])

  return (
    <div className="px-4 pt-6 pb-4">
      <CashUpClient
        expectedCash={summary.totalRevenue}
        totalProfit={summary.totalMargin}
        totalExpenses={todayExpenses}
        salesCount={summary.transactionCount}
        itemsSold={summary.itemsSold}
      />
    </div>
  )
}
