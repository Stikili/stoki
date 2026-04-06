import { cache } from 'react'
import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { getCachedStores } from './cached-queries'
import { getSelectedStoreId } from './selectedStore'
import { Store } from '@/domain/entities/store'

export interface ServerData {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: { id: string; email?: string; phone?: string }
  store: Store
  allStores: Store[]
}

/**
 * Fetches the authenticated user + their stores.
 * Wrapped with React.cache() so it executes once per request even when
 * called from both the layout and the page server component.
 * Stores list itself is cached across requests via getCachedStores (unstable_cache).
 */
export const getServerData = cache(async (): Promise<ServerData> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Stores come from the cross-request cache
  let allStores = await getCachedStores(user.id)

  // First-time user — create default store (bypasses cache, then revalidates)
  if (allStores.length === 0) {
    const { revalidateTag } = await import('next/cache')
    const { StoreRepository } = await import('@/infrastructure/supabase/repositories/StoreRepository')
    const { TAGS } = await import('./cache-tags')
    const storeRepo = new StoreRepository(supabase)
    const newStore = await storeRepo.create(user.id, 'My Store')
    revalidateTag(TAGS.stores, 'default')
    return { supabase, user, store: newStore, allStores: [newStore] }
  }

  const selectedId = await getSelectedStoreId()
  const store = allStores.find((s) => s.id === selectedId) ?? allStores[0]

  return { supabase, user, store, allStores }
})
