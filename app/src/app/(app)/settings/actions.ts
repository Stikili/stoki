'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerData } from '@/lib/getServerData'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { StoreUserRepository } from '@/infrastructure/supabase/repositories/StoreUserRepository'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { StoreRole } from '@/domain/entities/store-user'
import { TAGS } from '@/lib/cache-tags'

export async function updateStoreAction(formData: FormData) {
  const { supabase, store } = await getServerData()
  const name = (formData.get('name') as string).trim()
  const phone = (formData.get('phone') as string | null)?.trim() || undefined
  const location = (formData.get('location') as string | null)?.trim() || undefined
  const whatsappNumber = (formData.get('whatsappNumber') as string | null)?.trim().replace(/\D/g, '') || undefined
  const businessAddress = (formData.get('businessAddress') as string | null)?.trim() || ''

  if (!name) return

  const storeRepo = new StoreRepository(supabase)
  await storeRepo.update(store.id, { name, phone, location, whatsappNumber, businessAddress })

  revalidateTag(TAGS.stores, 'default')
  revalidatePath('/', 'layout')
}

export async function updateVatAction(formData: FormData) {
  const { supabase, store } = await getServerData()
  const vatRegistered = formData.get('vatRegistered') === 'on'
  const vatNumber = (formData.get('vatNumber') as string | null)?.trim() || ''
  const vatRateRaw = (formData.get('vatRate') as string | null)?.trim()
  const vatRate = vatRateRaw && vatRateRaw.length > 0 ? parseFloat(vatRateRaw) : 15

  const storeRepo = new StoreRepository(supabase)
  await storeRepo.update(store.id, {
    vatRegistered,
    vatNumber: vatRegistered ? vatNumber : null,
    vatRate: Number.isFinite(vatRate) && vatRate >= 0 ? vatRate : 15,
  })

  revalidateTag(TAGS.stores, 'default')
  revalidatePath('/', 'layout')
}

// Team management — owner only. Looks up an existing Stoki user by email
// and adds them to the current store with the chosen role.
// If the email isn't registered yet, sends them a Supabase magic-link invite
// and the membership row is created the moment they sign in.
export async function inviteMemberAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { user, store, role: callerRole } = await getServerData()
  if (callerRole !== 'owner') return { ok: false, error: 'Only the owner can invite members.' }

  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  const newRole = ((formData.get('role') as string) ?? 'cashier') as StoreRole
  if (!email || !email.includes('@')) return { ok: false, error: 'Enter a valid email.' }
  if (!['owner', 'manager', 'cashier'].includes(newRole)) {
    return { ok: false, error: 'Invalid role.' }
  }

  const admin = createAdminClient()
  const storeUserRepo = new StoreUserRepository(admin)

  // 1) Look up by email (admin API).
  const { data: lookup } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = lookup?.users?.find(u => u.email?.toLowerCase() === email) ?? null

  let inviteeId: string
  if (existing) {
    inviteeId = existing.id
  } else {
    // 2) Not registered — send a magic-link invite. They become a Stoki user on first click.
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)
    if (inviteError || !invited?.user) {
      return { ok: false, error: inviteError?.message ?? 'Could not send invite' }
    }
    inviteeId = invited.user.id
  }

  // 3) Add membership (idempotent — already-a-member conflict is a friendly error).
  try {
    await storeUserRepo.add(store.id, inviteeId, newRole, user.id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('duplicate key')) return { ok: false, error: 'That user is already on this team.' }
    return { ok: false, error: msg }
  }

  revalidateTag(TAGS.stores, 'default')
  revalidatePath('/settings')
  return { ok: true }
}

export async function updateMemberRoleAction(userId: string, newRole: StoreRole): Promise<{ ok: boolean; error?: string }> {
  const { store, role: callerRole } = await getServerData()
  if (callerRole !== 'owner') return { ok: false, error: 'Only the owner can change roles.' }
  if (!['owner', 'manager', 'cashier'].includes(newRole)) return { ok: false, error: 'Invalid role.' }

  const repo = new StoreUserRepository(createAdminClient())
  await repo.updateRole(store.id, userId, newRole)
  revalidatePath('/settings')
  return { ok: true }
}

export async function removeMemberAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { store, user, role: callerRole } = await getServerData()
  if (callerRole !== 'owner') return { ok: false, error: 'Only the owner can remove members.' }
  if (userId === user.id) return { ok: false, error: 'You can\'t remove yourself.' }

  const repo = new StoreUserRepository(createAdminClient())
  await repo.remove(store.id, userId)
  revalidateTag(TAGS.stores, 'default')
  revalidatePath('/settings')
  return { ok: true }
}

export async function deleteStoreAction(storeId: string) {
  const { supabase, allStores } = await getServerData()

  if (allStores.length <= 1) return // never delete the last store

  const storeRepo = new StoreRepository(supabase)
  await storeRepo.delete(storeId)

  revalidateTag(TAGS.stores, 'default')
  revalidatePath('/', 'layout')
  redirect('/stores')
}
