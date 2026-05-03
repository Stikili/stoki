import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getServerData } from '@/lib/getServerData'
import { StoreUserRepository } from '@/infrastructure/supabase/repositories/StoreUserRepository'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { StoreUser } from '@/domain/entities/store-user'
import RestrictedNotice from '@/components/RestrictedNotice'
import TeamCard from '@/components/settings/TeamCard'

export default async function TeamSettingsPage() {
  const { supabase, user, store, role } = await getServerData()

  // Team management is owner-only — managers and cashiers shouldn't see who's
  // on the team or rotate roles. They get a friendly notice and a way back.
  if (role !== 'owner') {
    return (
      <RestrictedNotice
        title="Team is owner-only"
        description="Only the store owner can invite team members or change their role."
      />
    )
  }

  let members: StoreUser[] = []
  try {
    const repo = new StoreUserRepository(supabase)
    const rows = await repo.findByStore(store.id)
    const admin = createAdminClient()
    members = await Promise.all(
      rows.map(async (m) => {
        try {
          const { data } = await admin.auth.admin.getUserById(m.userId)
          return { ...m, email: data.user?.email ?? null }
        } catch { return m }
      }),
    )
  } catch {
    members = []
  }

  // If somehow getServerData didn't supply a user, bail rather than render with
  // an empty currentUserId (which would let the caller "remove themself").
  if (!user) redirect('/login')

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-muted text-sm">
        <ArrowLeft size={14} /> Settings
      </Link>
      <h1 className="text-xl font-bold text-white">Team</h1>
      <TeamCard storeId={store.id} members={members} currentUserId={user.id} />
    </div>
  )
}
