import { getServerData } from '@/lib/getServerData'
import { CustomerRepository } from '@/infrastructure/supabase/repositories/CustomerRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { getCachedProducts } from '@/lib/cached-queries'
import RestrictedNotice from '@/components/RestrictedNotice'
import InvoicesClient from './InvoicesClient'

export default async function InvoicesPage() {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Invoices are restricted"
        description="Creating invoices and recording B2B payments is available to managers and the store owner."
      />
    )
  }
  const customerRepo = new CustomerRepository(supabase)
  const invoiceRepo = new InvoiceRepository(supabase)

  const [customers, invoices, products] = await Promise.all([
    customerRepo.findAll(store.id).catch(() => []),
    invoiceRepo.findAll(store.id).catch(() => []),
    getCachedProducts(store.id).catch(() => []),
  ])

  return (
    <div className="px-4 pt-6 pb-4">
      <InvoicesClient
        store={store}
        customers={customers}
        invoices={invoices}
        products={products}
      />
    </div>
  )
}
