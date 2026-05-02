import { getServerData } from '@/lib/getServerData'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import ReconcileClient from './ReconcileClient'

export default async function ReconcilePage() {
  const { supabase, store, role } = await getServerData()

  if (role === 'cashier') {
    return (
      <div className="px-4 pt-6 pb-4">
        <p className="text-muted text-sm">Bank reconciliation is restricted to owners and managers.</p>
      </div>
    )
  }

  const invoiceRepo = new InvoiceRepository(supabase)
  const expenseRepo = new ExpenseRepository(supabase)

  // Pull a generous lookback for matching — bank statements typically cover
  // the last 30-90 days. Open invoices may span longer if they're overdue.
  const now = new Date()
  const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90)

  const [openInvoices, recentExpenses] = await Promise.all([
    invoiceRepo.findOpen(store.id).catch(() => []),
    expenseRepo.findByPeriod(store.id, ninetyDaysAgo, now).catch(() => []),
  ])

  return (
    <div className="px-4 pt-6 pb-4">
      <ReconcileClient openInvoices={openInvoices} recentExpenses={recentExpenses} />
    </div>
  )
}
