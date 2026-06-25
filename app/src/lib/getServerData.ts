import { cache } from 'react'
import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { getCachedStores } from './cached-queries'
import { getSelectedStoreId } from './selectedStore'
import { Store } from '@/domain/entities/store'
import { StoreRole } from '@/domain/entities/store-user'

export interface ServerData {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: {
    id: string
    email?: string
    phone?: string
    /** Onboarding hints and other client-set flags. Read with care — never
     *  the source of truth for anything billable, just UX shortcuts. */
    user_metadata?: Record<string, unknown>
  }
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

  const allStores = await getCachedStores(user.id)

  // First-time user — no stores yet. Send them through the onboarding flow,
  // which creates the store properly via a server action (revalidateTag is
  // allowed there). The previous inline bootstrap called revalidateTag
  // during render, which Next.js 16 disallows as a hard error.
  if (allStores.length === 0) {
    redirect('/onboarding')
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
