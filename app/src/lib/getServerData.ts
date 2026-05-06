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
  // Both inserts go through the admin client because of the multi-user RLS
  // chicken-and-egg: the user has no `store_users` membership yet, so the
  // user-scoped client can't insert one (the `owners_manage_team` policy
  // requires you to already be an owner of the target store) — and after
  // migration 008 the products / suppliers / etc. inserts that follow also
  // depend on that membership row existing. Admin bypasses RLS only for
  // this bootstrap; we still scope every write to the user's id explicitly
  // so there's no cross-user leakage.
  if (allStores.length === 0) {
    const { revalidateTag } = await import('next/cache')
    const { StoreRepository } = await import('@/infrastructure/supabase/repositories/StoreRepository')
    const { StoreUserRepository } = await import('@/infrastructure/supabase/repositories/StoreUserRepository')
    const { createAdminClient } = await import('@/infrastructure/supabase/admin')
    const { TAGS } = await import('./cache-tags')
    const admin = createAdminClient()
    const storeRepo = new StoreRepository(admin)
    const storeUserRepo = new StoreUserRepository(admin)
    const newStore = await storeRepo.create(user.id, 'My Store')
    // No more silent try/catch around the membership insert: admin bypasses
    // RLS, so any failure now is a real bug we want surfaced rather than
    // swallowed and turned into a phantom-blocked-user-on-their-own-store.
    await storeUserRepo.add(newStore.id, user.id, 'owner', user.id)
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
