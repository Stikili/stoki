import { getServerData } from '@/lib/getServerData'
import { StoreUserRepository } from '@/infrastructure/supabase/repositories/StoreUserRepository'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import SettingsClient from './SettingsClient'
import { StoreUser } from '@/domain/entities/store-user'

export default async function SettingsPage() {
  const { supabase, user, store, allStores, role } = await getServerData()

  // Team list — fetched only when the caller is an owner. Use the admin client
  // to enrich rows with auth.users emails (which RLS on auth.users hides).
  let members: StoreUser[] = []
  if (role === 'owner') {
    try {
      const repo = new StoreUserRepository(supabase)
      const rows = await repo.findByStore(store.id)
      const admin = createAdminClient()
      const enriched = await Promise.all(
        rows.map(async (m) => {
          try {
            const { data } = await admin.auth.admin.getUserById(m.userId)
            return { ...m, email: data.user?.email ?? null }
          } catch {
            return m
          }
        }),
      )
      members = enriched
    } catch {
      members = []
    }
  }

  return (
    <SettingsClient
      store={store}
      canDelete={allStores.length > 1}
      role={role}
      currentUserId={user.id}
      members={members}
    />
  )
}
