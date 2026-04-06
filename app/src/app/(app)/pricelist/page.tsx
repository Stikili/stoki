import { getServerData } from '@/lib/getServerData'
import { getCachedProducts } from '@/lib/cached-queries'
import PriceListClient from './PriceListClient'

export default async function PriceListPage() {
  const { store } = await getServerData()
  const products = await getCachedProducts(store.id)

  return (
    <div className="px-4 pt-6 pb-4">
      <PriceListClient products={products} storeName={store.name} storePhone={store.phone} />
    </div>
  )
}
