'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerData } from '@/lib/getServerData'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { StoreUserRepository } from '@/infrastructure/supabase/repositories/StoreUserRepository'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { StoreRole } from '@/domain/entities/store-user'
import { TAGS, invalidateDashboard } from '@/lib/cache-tags'
import { hasFeature, type GateId } from '@/lib/plan-gates'
import { recordCancellation } from '@/lib/subscription'

export async function updateStoreAction(formData: FormData) {
  const { supabase, store } = await getServerData()
  const name = (formData.get('name') as string).trim()
  const phone = (formData.get('phone') as string | null)?.trim() || undefined
  const location = (formData.get('location') as string | null)?.trim() || undefined
  const whatsappNumber = (formData.get('whatsappNumber') as string | null)?.trim().replace(/\D/g, '') || undefined
  const businessAddress = (formData.get('businessAddress') as string | null)?.trim() || ''

  // Optional GPS — feeds weather + competitor-proximity push features. Empty
  // string clears the column; an actual number value writes it.
  const latRaw = (formData.get('lat') as string | null)?.trim() ?? ''
  const lngRaw = (formData.get('lng') as string | null)?.trim() ?? ''
  const lat = latRaw === '' ? null : Number(latRaw)
  const lng = lngRaw === '' ? null : Number(lngRaw)
  const validLat = lat === null || (Number.isFinite(lat) && lat >= -90 && lat <= 90)
  const validLng = lng === null || (Number.isFinite(lng) && lng >= -180 && lng <= 180)

  // Optional cash float — feeds working-capital-gap push feature. Empty =
  // not tracked; explicit 0 = "I have no cash" (still a meaningful signal).
  const cashRaw = (formData.get('cashBalance') as string | null)?.trim() ?? ''
  const cashBalance = cashRaw === '' ? null : Number(cashRaw)
  const validCash = cashBalance === null || (Number.isFinite(cashBalance) && cashBalance >= 0)

  if (!name) return

  const storeRepo = new StoreRepository(supabase)
  await storeRepo.update(store.id, {
    name, phone, location, whatsappNumber, businessAddress,
    ...(validLat ? { lat } : {}),
    ...(validLng ? { lng } : {}),
    ...(validCash ? { cashBalance } : {}),
  })

  revalidateTag(TAGS.stores, 'default')
  revalidatePath('/', 'layout')
  invalidateDashboard()
}

export async function updateVatAction(formData: FormData) {
  const { supabase, store } = await getServerData()
  const vatRegistered = formData.get('vatRegistered') === 'on'
  const vatNumber = (formData.get('vatNumber') as string | null)?.trim() || ''
  const vatRateRaw = (formData.get('vatRate') as string | null)?.trim()
  const vatRate = vatRateRaw && vatRateRaw.length > 0 ? parseFloat(vatRateRaw) : 15

  // Taxpayer type drives the provisional-tax estimator on the dashboard. Lives
  // on the same form because owners think of "VAT & tax" as one settings group.
  const taxpayerRaw = (formData.get('taxpayerType') as string | null)?.trim()
  const taxpayerType: 'sole_prop' | 'sbc' | 'turnover_tax' | 'company' | undefined =
    taxpayerRaw === 'sole_prop' || taxpayerRaw === 'sbc' ||
    taxpayerRaw === 'turnover_tax' || taxpayerRaw === 'company'
      ? taxpayerRaw
      : undefined

  const storeRepo = new StoreRepository(supabase)
  await storeRepo.update(store.id, {
    vatRegistered,
    vatNumber: vatRegistered ? vatNumber : null,
    vatRate: Number.isFinite(vatRate) && vatRate >= 0 ? vatRate : 15,
    ...(taxpayerType ? { taxpayerType } : {}),
  })

  revalidateTag(TAGS.stores, 'default')
  revalidatePath('/', 'layout')
}

// Bulk-set the vat_inclusive flag across every product in the store. Used after
// turning on VAT for the first time when existing prices were ex-VAT (or vice versa).
export async function setAllProductsVatInclusiveAction(vatInclusive: boolean): Promise<{ updated: number }> {
  const { supabase, store } = await getServerData()
  const { ProductRepository } = await import('@/infrastructure/supabase/repositories/ProductRepository')
  const repo = new ProductRepository(supabase)
  const updated = await repo.setVatInclusiveAll(store.id, vatInclusive)
  revalidateTag(TAGS.products, 'default')
  revalidatePath('/inventory')
  revalidatePath('/settings')
  return { updated }
}

// Team management — owner only. Looks up an existing Stoki user by email
// and adds them to the current store with the chosen role.
// If the email isn't registered yet, sends them a Supabase magic-link invite
// and the membership row is created the moment they sign in.
export async function inviteMemberAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; locked?: GateId }> {
  const { supabase, user, store, role: callerRole } = await getServerData()
  if (callerRole !== 'owner') return { ok: false, error: 'Only the owner can invite members.' }

  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  const newRole = ((formData.get('role') as string) ?? 'cashier') as StoreRole
  if (!email || !email.includes('@')) return { ok: false, error: 'Enter a valid email.' }
  if (!['owner', 'manager', 'cashier'].includes(newRole)) {
    return { ok: false, error: 'Invalid role.' }
  }

  // Plan gate. Count existing memberships first, then pick the right gate
  // for what the user is about to do (add the second member vs. the eleventh).
  // We use the user-scoped client for the count so RLS limits us to memberships
  // we can already see — matches what the owner experiences in /settings/team.
  const { count: memberCount } = await supabase
    .from('store_users')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', store.id)
  const current = memberCount ?? 1
  if (current >= 1 && !hasFeature(store, 'team.invite.beyond_owner')) {
    return { ok: false, error: 'Adding a teammate is a Pro feature.', locked: 'team.invite.beyond_owner' }
  }
  if (current >= 2 && !hasFeature(store, 'team.invite.beyond_2')) {
    return { ok: false, error: 'Up to 2 teammates on Pro — upgrade to Business for more.', locked: 'team.invite.beyond_2' }
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

/**
 * User-initiated cancel. Admin client because the store_users RLS would
 * otherwise block the update on a row where the only writers are owners
 * and we want a clean transactional update. The user keeps `plan` until
 * `subscription_active_until` — they paid for the period.
 */
export async function cancelSubscriptionAction(): Promise<{ ok: boolean; error?: string }> {
  const { user, store, role } = await getServerData()
  if (role !== 'owner') return { ok: false, error: 'Only the owner can cancel.' }
  if (store.subscriptionStatus !== 'active' && store.subscriptionStatus !== 'past_due') {
    return { ok: false, error: 'No active subscription to cancel.' }
  }
  await recordCancellation(createAdminClient(), store.id, user.id)
  revalidateTag(TAGS.stores, 'default')
  revalidatePath('/settings/billing')
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
