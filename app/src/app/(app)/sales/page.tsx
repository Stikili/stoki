import { getServerData } from '@/lib/getServerData'
import { getCachedProducts } from '@/lib/cached-queries'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import SalesClient from './SalesClient'

export default async function SalesPage() {
  const { supabase, store } = await getServerData()
  const saleRepo = new SaleRepository(supabase)

  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0)

  const [products, todaySales, recentSales] = await Promise.all([
    getCachedProducts(store.id),
    saleRepo.findByPeriod(store.id, dayStart, dayEnd),
    saleRepo.findByPeriod(store.id, weekStart, dayEnd),
  ])

  // Top 5 most-sold products for quick sell
  const salesCount: Record<string, number> = {}
  for (const s of recentSales) {
    if (s.productId) salesCount[s.productId] = (salesCount[s.productId] ?? 0) + s.qty
  }
  const topProducts = products
    .filter((p) => p.qty > 0)
    .sort((a, b) => (salesCount[b.id] ?? 0) - (salesCount[a.id] ?? 0))
    .slice(0, 5)

  return (
    <div className="px-4 pt-6 pb-4">
      <SalesClient
        products={products}
        todaySales={todaySales}
        storeName={store.name}
        topProducts={topProducts}
        vatRegistered={store.vatRegistered}
        vatNumber={store.vatNumber}
        vatRate={store.vatRate}
        businessAddress={store.businessAddress}
        businessPhone={store.phone}
      />
    </div>
  )
}
