import { getServerData } from '@/lib/getServerData'
import { getCachedProducts } from '@/lib/cached-queries'
import InventoryClient from './InventoryClient'

export default async function InventoryPage() {
  const { store } = await getServerData()
  const products = await getCachedProducts(store.id)

  return (
    <div className="px-4 pt-6 pb-4">
      <InventoryClient products={products} />
    </div>
  )
}
