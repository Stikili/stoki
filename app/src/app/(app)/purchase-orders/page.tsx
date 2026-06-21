import { getServerData } from '@/lib/getServerData'
import { PurchaseOrderRepository } from '@/infrastructure/supabase/repositories/PurchaseOrderRepository'
import { SupplierRepository } from '@/infrastructure/supabase/repositories/SupplierRepository'
import { getCachedProducts } from '@/lib/cached-queries'
import RestrictedNotice from '@/components/RestrictedNotice'
import LockedFeatureNotice from '@/components/LockedFeatureNotice'
import { hasFeature } from '@/lib/plan-gates'
import PurchaseOrdersClient from './PurchaseOrdersClient'

export default async function PurchaseOrdersPage() {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Purchase orders are restricted"
        description="Procurement is available to managers and the store owner."
      />
    )
  }
  if (!hasFeature(store, 'purchase_orders.create')) {
    return <LockedFeatureNotice gate="purchase_orders.create" />
  }

  const poRepo = new PurchaseOrderRepository(supabase)
  const supplierRepo = new SupplierRepository(supabase)

  const [pos, suppliers, products] = await Promise.all([
    poRepo.findAll(store.id).catch(() => []),
    supplierRepo.findAll(store.id).catch(() => []),
    getCachedProducts(store.id).catch(() => []),
  ])

  return (
    <div className="px-4 pt-6 pb-4">
      <PurchaseOrdersClient pos={pos} suppliers={suppliers} products={products} />
    </div>
  )
}
