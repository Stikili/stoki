import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { getSelectedStoreId } from '@/lib/selectedStore'
import BottomNav from '@/components/BottomNav'
import StoreHeader from '@/components/StoreHeader'
import Walkthrough from '@/components/Walkthrough'
import OfflineBanner from '@/components/OfflineBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const storeRepo = new StoreRepository(supabase)
  const allStores = await storeRepo.findAllByOwner(user.id)

  if (allStores.length === 0 || (allStores.length === 1 && allStores[0].name === 'My Store')) {
    redirect('/onboarding')
  }

  const selectedId = await getSelectedStoreId()
  const store = allStores.find((s) => s.id === selectedId) ?? allStores[0]

  const alertRepo = new AlertRepository(supabase)
  const unreadAlerts = await alertRepo.findUnread(store.id)
  const unreadInsights = unreadAlerts.filter((a) => a.type === 'ai_insight').length

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <StoreHeader store={store} allStores={allStores} unreadAlerts={unreadAlerts.length} />
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>
      <BottomNav unreadInsights={unreadInsights} />
      <Walkthrough />
    </div>
  )
}
