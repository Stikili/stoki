import { getServerData } from '@/lib/getServerData'
import { getCachedProducts } from '@/lib/cached-queries'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { SupplierRepository } from '@/infrastructure/supabase/repositories/SupplierRepository'
import InventoryClient from './InventoryClient'

type InventoryFilter = 'all' | 'low' | 'out' | 'expiring' | 'low-margin' | 'dead'

const DEAD_STOCK_DAYS = 21

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { supabase, store, role } = await getServerData()
  const products = await getCachedProducts(store.id)
  const { filter } = await searchParams
  const initialFilter: InventoryFilter =
    filter === 'low' || filter === 'out' || filter === 'expiring' || filter === 'low-margin' || filter === 'dead'
      ? filter
      : 'all'

  const saleRepo = new SaleRepository(supabase)
  const supplierRepo = new SupplierRepository(supabase)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)
  const deadCutoff = new Date(now)
  deadCutoff.setDate(now.getDate() - DEAD_STOCK_DAYS)
  deadCutoff.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now)
  dayEnd.setHours(23, 59, 59, 999)

  // Three queries in parallel:
  //   recentSales — 7-day window for the velocity map (existing)
  //   deadWindowSales — 21-day window so we know which SKUs to consider "dead"
  //   suppliers — degrade gracefully pre-migration-006
  const [recentSales, deadWindowSales, suppliers] = await Promise.all([
    saleRepo.findByPeriod(store.id, weekStart, dayEnd),
    saleRepo.findByPeriod(store.id, deadCutoff, dayEnd),
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

  // Set of product_ids that have been sold within the dead-stock window. The
  // client uses the *complement* (products with qty>0 AND not in this set)
  // for the `dead` filter — keeping the calculation server-side means a
  // product's dead/alive status is consistent with the same query the
  // F-P-03 dead-stock cron uses.
  const soldRecentlyIds = Array.from(
    new Set(deadWindowSales.map(s => s.productId).filter((id): id is string => Boolean(id))),
  )

  return (
    <div className="px-4 pt-6 pb-4">
      <InventoryClient
        products={products}
        salesVelocity={velocity}
        suppliers={suppliers}
        storeVatRegistered={store.vatRegistered}
        role={role}
        initialFilter={initialFilter}
        soldRecentlyIds={soldRecentlyIds}
      />
    </div>
  )
}
