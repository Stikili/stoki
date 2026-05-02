import { getServerData } from '@/lib/getServerData'
import { getCachedProducts } from '@/lib/cached-queries'
import { StocktakeRepository } from '@/infrastructure/supabase/repositories/StocktakeRepository'
import StocktakeClient from './StocktakeClient'

export default async function StocktakePage() {
  const { supabase, store, role } = await getServerData()

  // Cashiers shouldn't be able to adjust stock counts — they sell, not audit.
  if (role === 'cashier') {
    return (
      <div className="px-4 pt-6 pb-4">
        <p className="text-muted text-sm">Stocktake is restricted to owners and managers.</p>
      </div>
    )
  }

  const products = await getCachedProducts(store.id)
  const stocktakeRepo = new StocktakeRepository(supabase)
  // Pre-migration-011 fallback so the app still loads if the SQL hasn't been applied yet.
  const recent = await stocktakeRepo.findRecent(store.id, 10).catch(() => [])

  return (
    <div className="px-4 pt-6 pb-4">
      <StocktakeClient products={products} recent={recent} />
    </div>
  )
}
