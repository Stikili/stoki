import { getServerData } from '@/lib/getServerData'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { BankReconciliationRepository } from '@/infrastructure/supabase/repositories/BankReconciliationRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import ReconcileClient from './ReconcileClient'

export default async function ReconcilePage() {
  const { supabase, store, role } = await getServerData()

  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Bank reconciliation is restricted"
        description="Matching bank statements to invoices and expenses is available to managers and the store owner."
      />
    )
  }

  const invoiceRepo = new InvoiceRepository(supabase)
  const expenseRepo = new ExpenseRepository(supabase)
  const reconRepo = new BankReconciliationRepository(supabase)

  // Pull a generous lookback for matching — bank statements typically cover
  // the last 30-90 days. Open invoices may span longer if they're overdue.
  const now = new Date()
  const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90)

  const [openInvoices, recentExpenses, resolvedKeys] = await Promise.all([
    invoiceRepo.findOpen(store.id).catch(() => []),
    expenseRepo.findByPeriod(store.id, ninetyDaysAgo, now).catch(() => []),
    reconRepo.findResolvedKeys(store.id).catch(() => new Set<string>()),
  ])

  return (
    <div className="px-4 pt-6 pb-4">
      <ReconcileClient
        openInvoices={openInvoices}
        recentExpenses={recentExpenses}
        resolvedKeys={[...resolvedKeys]}
      />
    </div>
  )
}
