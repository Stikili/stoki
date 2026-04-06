import { getServerData } from '@/lib/getServerData'
import { getCachedProducts } from '@/lib/cached-queries'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import InventoryClient from './InventoryClient'

export default async function InventoryPage() {
  const { supabase, store } = await getServerData()
  const products = await getCachedProducts(store.id)

  // Compute 7-day sales velocity per product for smart restock suggestions
  const saleRepo = new SaleRepository(supabase)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now)
  dayEnd.setHours(23, 59, 59, 999)

  const recentSales = await saleRepo.findByPeriod(store.id, weekStart, dayEnd)
  const velocity: Record<string, number> = {}
  for (const sale of recentSales) {
    if (sale.productId) {
      velocity[sale.productId] = (velocity[sale.productId] ?? 0) + sale.qty
    }
  }
  // Convert to daily average
  for (const id of Object.keys(velocity)) {
    velocity[id] = velocity[id] / 7
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <InventoryClient products={products} salesVelocity={velocity} />
    </div>
  )
}
