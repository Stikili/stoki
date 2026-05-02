import { getServerData } from '@/lib/getServerData'
import { CustomerRepository } from '@/infrastructure/supabase/repositories/CustomerRepository'
import { WhatsAppBroadcastRepository } from '@/infrastructure/supabase/repositories/WhatsAppBroadcastRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import BroadcastsClient from './BroadcastsClient'

export default async function BroadcastsPage() {
  const { supabase, store, role } = await getServerData()

  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Broadcasts are restricted"
        description="Sending WhatsApp customer broadcasts is available to managers and the store owner."
      />
    )
  }

  const customerRepo = new CustomerRepository(supabase)
  const broadcastRepo = new WhatsAppBroadcastRepository(supabase)

  const [customers, recent] = await Promise.all([
    customerRepo.findAll(store.id).catch(() => []),
    // Pre-migration-014 fallback so the page still loads if the SQL hasn't been applied yet.
    broadcastRepo.findRecent(store.id, 10).catch(() => []),
  ])

  // Only customers with phone numbers can ever receive — surface this to the UI
  // so the empty-state messaging is clear ("0 reachable" vs "0 opted-in").
  const reachable = customers.filter((c) => c.phone && c.phone.trim().length > 0)
  const optedIn = reachable.filter((c) => c.marketingOptIn)

  return (
    <div className="px-4 pt-6 pb-4">
      <BroadcastsClient
        customers={optedIn}
        reachableCount={reachable.length}
        totalCustomers={customers.length}
        recentBroadcasts={recent}
      />
    </div>
  )
}
