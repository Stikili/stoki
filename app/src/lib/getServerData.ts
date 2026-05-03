import { cache } from 'react'
import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { getCachedStores } from './cached-queries'
import { getSelectedStoreId } from './selectedStore'
import { ensureDemoStore } from './ensureDemoStore'
import { Store } from '@/domain/entities/store'
import { StoreRole } from '@/domain/entities/store-user'

export interface ServerData {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: { id: string; email?: string; phone?: string }
  store: Store
  allStores: Store[]
  /** Caller's role in the selected store. 'owner' for first-time auto-created stores. */
  role: StoreRole
}

/**
 * Fetches the authenticated user + their stores.
 * Wrapped with React.cache() so it executes once per request even when
 * called from both the layout and the page server component.
 */
export const getServerData = cache(async (): Promise<ServerData> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Every account gets a "Stoki Demo Shop" with showcase data on first load
  // — runs once per user, idempotent via user_metadata.demo_seeded.
  await ensureDemoStore(supabase, user)

  const allStores = await getCachedStores(user.id)

  // First-time user — create default store + bootstrap them as owner in store_users.
  if (allStores.length === 0) {
    const { revalidateTag } = await import('next/cache')
    const { StoreRepository } = await import('@/infrastructure/supabase/repositories/StoreRepository')
    const { StoreUserRepository } = await import('@/infrastructure/supabase/repositories/StoreUserRepository')
    const { TAGS } = await import('./cache-tags')
    const storeRepo = new StoreRepository(supabase)
    const storeUserRepo = new StoreUserRepository(supabase)
    const newStore = await storeRepo.create(user.id, 'My Store')
    // Best-effort membership row. If migration 008 hasn't run yet, this throws and is swallowed —
    // the user can still operate via owner_id-based RLS until the migration is applied.
    try {
      await storeUserRepo.add(newStore.id, user.id, 'owner', user.id)
    } catch { /* migration 008 may not be applied — non-fatal */ }
    revalidateTag(TAGS.stores, 'default')
    return { supabase, user, store: newStore, allStores: [newStore], role: 'owner' }
  }

  const selectedId = await getSelectedStoreId()
  const store = allStores.find((s) => s.id === selectedId) ?? allStores[0]

  // Resolve role for the selected store. Falls back to 'owner' if the store_users
  // table isn't queryable yet (e.g. owner_id-only world before migration 008).
  let role: StoreRole = 'owner'
  try {
    const { data } = await supabase
      .from('store_users')
      .select('role')
      .eq('store_id', store.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (data?.role) role = data.role as StoreRole
    else if (store.ownerId === user.id) role = 'owner'
  } catch {
    role = store.ownerId === user.id ? 'owner' : 'cashier'
  }

  return { supabase, user, store, allStores, role }
})
