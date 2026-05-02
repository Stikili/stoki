import { getServerData } from '@/lib/getServerData'
import { getCachedProducts } from '@/lib/cached-queries'
import { AirtimePinRepository } from '@/infrastructure/supabase/repositories/AirtimePinRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import AirtimeClient from './AirtimeClient'

export default async function AirtimePage() {
  const { supabase, store, role } = await getServerData()

  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Airtime is restricted"
        description="Loading airtime PINs is available to managers and the store owner. Cashiers can sell airtime from /sales as long as PINs have been uploaded."
      />
    )
  }

  const products = await getCachedProducts(store.id)
  const airtimeProducts = products.filter((p) => p.isAirtime)

  // Per-product available count. Pre-migration-012 fallback so the page still
  // loads when the airtime_pins table doesn't exist yet.
  const pinRepo = new AirtimePinRepository(supabase)
  const counts: Record<string, number> = {}
  await Promise.all(
    airtimeProducts.map(async (p) => {
      counts[p.id] = await pinRepo.countAvailable(store.id, p.id).catch(() => 0)
    }),
  )

  return (
    <div className="px-4 pt-6 pb-4">
      <AirtimeClient products={airtimeProducts} availableCounts={counts} />
    </div>
  )
}
