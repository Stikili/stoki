import { getServerData } from '@/lib/getServerData'
import { getCachedProducts } from '@/lib/cached-queries'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { SupplierRepository } from '@/infrastructure/supabase/repositories/SupplierRepository'
import InventoryClient from './InventoryClient'

export default async function InventoryPage() {
  const { supabase, store, role } = await getServerData()
  const products = await getCachedProducts(store.id)

  const saleRepo = new SaleRepository(supabase)
  const supplierRepo = new SupplierRepository(supabase)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now)
  dayEnd.setHours(23, 59, 59, 999)

  // Suppliers may be missing pre-migration-006; degrade gracefully.
  const [recentSales, suppliers] = await Promise.all([
    saleRepo.findByPeriod(store.id, weekStart, dayEnd),
    supplierRepo.findAll(store.id).catch(() => []),
  ])

  const velocity: Record<string, number> = {}
  for (const sale of recentSales) {
    if (sale.productId) {
      velocity[sale.productId] = (velocity[sale.productId] ?? 0) + sale.qty
    }
  }
  for (const id of Object.keys(velocity)) {
    velocity[id] = velocity[id] / 7
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <InventoryClient
        products={products}
        salesVelocity={velocity}
        suppliers={suppliers}
        storeVatRegistered={store.vatRegistered}
        role={role}
      />
    </div>
  )
}
