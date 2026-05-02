import { getServerData } from '@/lib/getServerData'
import { CustomerRepository } from '@/infrastructure/supabase/repositories/CustomerRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Customers are restricted"
        description="The B2B customer book is available to managers and the store owner."
      />
    )
  }
  const customerRepo = new CustomerRepository(supabase)
  const invoiceRepo = new InvoiceRepository(supabase)

  // Pre-migration-009 fallback so the page still loads if migration hasn't run.
  const [customers, archived, invoices] = await Promise.all([
    customerRepo.findAll(store.id).catch(() => []),
    customerRepo.findArchived(store.id).catch(() => []),
    invoiceRepo.findAll(store.id).catch(() => []),
  ])

  // Aggregate per-customer outstanding balance + last invoice date for the list.
  const stats: Record<string, { outstanding: number; lastInvoice: string | null; count: number }> = {}
  for (const inv of invoices) {
    if (!inv.customerId) continue
    if (inv.status === 'cancelled') continue
    const s = stats[inv.customerId] ?? { outstanding: 0, lastInvoice: null, count: 0 }
    s.outstanding += Math.max(0, inv.total - inv.amountPaid)
    s.count += 1
    if (!s.lastInvoice || inv.issuedAt > s.lastInvoice) s.lastInvoice = inv.issuedAt
    stats[inv.customerId] = s
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <CustomersClient customers={customers} archived={archived} stats={stats} />
    </div>
  )
}
