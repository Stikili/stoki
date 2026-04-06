import { getServerData } from '@/lib/getServerData'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import ExpensesClient from './ExpensesClient'

export default async function ExpensesPage() {
  const { supabase, store } = await getServerData()
  const expenseRepo = new ExpenseRepository(supabase)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const expenses = await expenseRepo.findByPeriod(store.id, monthStart, monthEnd)
  const totalThisMonth = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="px-4 pt-6 pb-4">
      <ExpensesClient expenses={expenses} totalThisMonth={totalThisMonth} />
    </div>
  )
}
