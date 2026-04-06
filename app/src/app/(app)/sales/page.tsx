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

  // Products from cache; today's sales always fresh
  const [products, todaySales] = await Promise.all([
    getCachedProducts(store.id),
    saleRepo.findByPeriod(store.id, dayStart, dayEnd),
  ])

  return (
    <div className="px-4 pt-6 pb-4">
      <SalesClient products={products} todaySales={todaySales} storeName={store.name} />
    </div>
  )
}
