import { getServerData } from '@/lib/getServerData'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { RecurringExpenseRepository } from '@/infrastructure/supabase/repositories/RecurringExpenseRepository'
import { postDueRecurringExpenses } from '@/application/expenses/postDueRecurringExpenses'
import RestrictedNotice from '@/components/RestrictedNotice'
import ExpensesClient from './ExpensesClient'

export default async function ExpensesPage() {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Expenses are restricted"
        description="Recording business expenses is available to managers and the store owner."
      />
    )
  }
  const expenseRepo = new ExpenseRepository(supabase)
  const recurringRepo = new RecurringExpenseRepository(supabase)

  const now = new Date()

  // Lazy auto-post — if cron is dark, browsing /expenses catches up missed
  // recurring rules so the period totals here are honest. Cron remains the
  // primary path; this is the backstop.
  await postDueRecurringExpenses(store.id, expenseRepo, recurringRepo, now).catch(() => null)

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
