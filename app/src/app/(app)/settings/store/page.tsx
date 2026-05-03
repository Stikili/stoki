import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import StoreDetailsCard from '@/components/settings/StoreDetailsCard'

export default async function StoreSettingsPage() {
  const { store, allStores } = await getServerData()

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-muted text-sm">
        <ArrowLeft size={14} /> Settings
      </Link>
      <h1 className="text-xl font-bold text-white">Store details</h1>
      <StoreDetailsCard store={store} canDelete={allStores.length > 1} />
    </div>
  )
}
