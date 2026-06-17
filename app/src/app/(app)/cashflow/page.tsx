import { getServerData } from '@/lib/getServerData'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { SupplierBillRepository } from '@/infrastructure/supabase/repositories/SupplierBillRepository'
import { RecurringExpenseRepository } from '@/infrastructure/supabase/repositories/RecurringExpenseRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import CashflowClient from './CashflowClient'
import { buildForecast } from '@/lib/cashflow-forecast'

export default async function CashflowPage() {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Cash-flow forecast is restricted"
        description="Forecasting cash position is available to managers and the store owner."
      />
    )
  }

  const saleRepo = new SaleRepository(supabase)
  const expenseRepo = new ExpenseRepository(supabase)
  const invoiceRepo = new InvoiceRepository(supabase)
  const billRepo = new SupplierBillRepository(supabase)
  const recurringRepo = new RecurringExpenseRepository(supabase)

  const now = new Date()
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7)
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30)

  const [
    last7,
    last30Expenses,
    openInvoices,
    openBills,
    activeRules,
  ] = await Promise.all([
    saleRepo.summarise(store.id, sevenDaysAgo, now),
    expenseRepo.sumByPeriod(store.id, thirtyDaysAgo, now),
    invoiceRepo.findOpen(store.id).catch(() => []),
    billRepo.findOpen(store.id).catch(() => []),
    recurringRepo.findActive(store.id).catch(() => []),
  ])

  const avgDailyRevenue = last7.totalRevenue / 7
  const avgDailyVariableExpense = last30Expenses / 30

  const forecast = buildForecast({
    startingCash: store.cashBalance,
    openInvoices,
    openBills,
    recurringExpenses: activeRules,
    avgDailyRevenue,
    avgDailyVariableExpense,
    windowDays: 30,
    now,
  })

  return (
    <div className="px-4 pt-6 pb-4">
      <CashflowClient
        cashBalance={store.cashBalance}
        cashBalanceUpdatedAt={store.cashBalanceUpdatedAt}
        forecast={JSON.parse(JSON.stringify(forecast))}
        avgDailyRevenue={avgDailyRevenue}
        avgDailyVariableExpense={avgDailyVariableExpense}
      />
    </div>
  )
}
