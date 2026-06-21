import { getServerData } from '@/lib/getServerData'
import { SupplierBillRepository } from '@/infrastructure/supabase/repositories/SupplierBillRepository'
import { SupplierRepository } from '@/infrastructure/supabase/repositories/SupplierRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import LockedFeatureNotice from '@/components/LockedFeatureNotice'
import { hasFeature } from '@/lib/plan-gates'
import PayablesClient from './PayablesClient'

export default async function PayablesPage() {
  const { supabase, store, role } = await getServerData()

  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Payables are restricted"
        description="Tracking supplier bills and recording payments is available to managers and the store owner."
      />
    )
  }
  if (!hasFeature(store, 'payables.manage')) {
    return <LockedFeatureNotice gate="payables.manage" />
  }

  const billRepo = new SupplierBillRepository(supabase)
  const supplierRepo = new SupplierRepository(supabase)

  const [bills, suppliers] = await Promise.all([
    billRepo.findAll(store.id).catch(() => []),
    supplierRepo.findAll(store.id).catch(() => []),
  ])

  return (
    <div className="px-4 pt-6 pb-4">
      <PayablesClient store={store} bills={bills} suppliers={suppliers} />
    </div>
  )
}
