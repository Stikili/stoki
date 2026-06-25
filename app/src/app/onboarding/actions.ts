'use server'

import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { setSelectedStoreId } from '@/lib/selectedStore'
import { StoreCategory } from '@/domain/entities/store'
import { hasFeature, type GateId } from '@/lib/plan-gates'

// Step 2: save name + category, return the storeId (no redirect — client handles next step)
export async function saveStoreAction(
  formData: FormData,
): Promise<{ storeId: string; locked?: GateId; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const storeRepo = new StoreRepository(supabase)
  const name = (formData.get('name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim() || undefined
  const category = (formData.get('category') as StoreCategory) || 'spaza'
  const isNew = formData.get('new') === '1'

  if (!name) redirect('/onboarding')

  const allStores = await storeRepo.findAllByOwner(user.id)
  const isFirstStore = allStores.length === 0

  let storeId: string
  if (!isNew && allStores.length === 1 && allStores[0].name === 'My Store') {
    // Legacy "My Store" placeholder from the old getServerData bootstrap —
    // repurpose. The user already has a store_users membership row from
    // that bootstrap, so we just rename + categorise.
    const updated = await storeRepo.update(allStores[0].id, { name, phone, category, onboardingCompleted: false })
    storeId = updated.id
  } else {
    // Either the user's first store (brand-new account) OR "add another
    // store" for an existing multi-store owner. Plan gate the multi-store
    // path — first store is always free.
    if (allStores.length >= 1 && !hasFeature(allStores[0], 'store.create.beyond_1')) {
      return { storeId: '', locked: 'store.create.beyond_1', error: 'Multi-store is a Business feature.' }
    }
    if (allStores.length >= 3 && !hasFeature(allStores[0], 'store.create.beyond_3')) {
      return { storeId: '', locked: 'store.create.beyond_3', error: 'Up to 3 stores on Business — talk to us about Enterprise.' }
    }
    const newStore = await storeRepo.create(user.id, name, phone)
    // First store gets a fresh 14-day Pro trial. Additional stores inherit
    // the trial window from the user's first store so the experience stays
    // consistent.
    const grandfatheredUntil = isFirstStore
      ? new Date(Date.now() + 14 * 86_400_000).toISOString()
      : (allStores[0]?.grandfatheredUntil ?? null)
    await storeRepo.update(newStore.id, { category, onboardingCompleted: false, grandfatheredUntil })

    // store_users membership — RLS chicken-and-egg: the policy requires
    // the user to already be an owner of the store, which is impossible
    // for a first-time membership. Admin client bypasses, but the scope
    // is still safe because we just created the store with owner_id =
    // user.id, so we're only adding a membership for ourselves.
    const { createAdminClient } = await import('@/infrastructure/supabase/admin')
    const { StoreUserRepository } = await import('@/infrastructure/supabase/repositories/StoreUserRepository')
    const admin = createAdminClient()
    const storeUserRepo = new StoreUserRepository(admin)
    await storeUserRepo.add(newStore.id, user.id, 'owner', user.id)

    storeId = newStore.id
  }
  await setSelectedStoreId(storeId)
  revalidateTag(TAGS.stores, 'default')
  return { storeId }
}

/**
 * New: persist optional GPS + cash float captured in the onboarding
 * "details" step. Keeps the field-validation rules consistent with
 * settings/actions.ts so a user can hit either entry point and get the
 * same behaviour. Empty / out-of-range values are silently dropped — we'd
 * rather not block onboarding on a typo.
 */
export async function saveStoreDetailsAction(
  storeId: string,
  raw: {
    lat?: string; lng?: string; cashBalance?: string;
    /** "Are you VAT-registered?" answered during onboarding. Writes through
     *  to store.vat_registered so the existing VAT plumbing kicks in
     *  without the owner needing to dig into /settings/vat. */
    vatRegistered?: boolean;
    /** "Do you have employees?" answered during onboarding. Stored on the
     *  user's auth metadata as a *hint* — the actual gating is by employee
     *  count, but this lets us pre-hide the Payroll tile on day 1 before
     *  any employees exist, and surface it as soon as the owner adds one. */
    hasEmployees?: boolean;
    /** "I mostly want to…" answer. Drives the initial dashboard density —
     *  true collapses the Books tile section behind a click-to-expand,
     *  false shows everything. Owner can flip it later in
     *  /settings/account → Dashboard density. */
    simpleView?: boolean;
  },
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const storeRepo = new StoreRepository(supabase)
  const allStores = await storeRepo.findAllByOwner(user.id)
  if (!allStores.find((s) => s.id === storeId)) redirect('/login')

  const lat = raw.lat?.trim() ? Number(raw.lat) : null
  const lng = raw.lng?.trim() ? Number(raw.lng) : null
  const cashBalance = raw.cashBalance?.trim() ? Number(raw.cashBalance) : null

  const validLat = lat === null || (Number.isFinite(lat) && lat >= -90 && lat <= 90)
  const validLng = lng === null || (Number.isFinite(lng) && lng >= -180 && lng <= 180)
  const validCash = cashBalance === null || (Number.isFinite(cashBalance) && cashBalance >= 0)

  await storeRepo.update(storeId, {
    ...(validLat ? { lat } : {}),
    ...(validLng ? { lng } : {}),
    ...(validCash ? { cashBalance } : {}),
    ...(raw.vatRegistered !== undefined ? { vatRegistered: raw.vatRegistered } : {}),
    // stores.has_employees (migration 032) is per-store — multi-store owners
    // can have payroll on one shop but not another. Dashboard tile-gating
    // ORs this against the actual employee count.
    ...(raw.hasEmployees !== undefined ? { hasEmployees: raw.hasEmployees } : {}),
    ...(raw.simpleView !== undefined ? { simpleView: raw.simpleView } : {}),
  })

  revalidateTag(TAGS.stores, 'default')
}

// Step 3: optionally seed starter products, mark onboarding complete, redirect to dashboard
export async function completeOnboardingAction(
  storeId: string,
  category: StoreCategory,
  seedProducts: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const storeRepo = new StoreRepository(supabase)
  const allStores = await storeRepo.findAllByOwner(user.id)
  if (!allStores.find((s) => s.id === storeId)) redirect('/login')

  if (seedProducts) {
    const { data: starters } = await supabase
      .from('starter_products')
      .select('*')
      .eq('category', category)

    if (starters && starters.length > 0) {
      const productRepo = new ProductRepository(supabase)
      await Promise.all(
        starters.map((p) =>
          productRepo.create(storeId, {
            name: p.name,
            price: Number(p.price),
            cost: Number(p.cost),
            qty: 0,
            reorderPoint: p.reorder_point,
          })
        )
      )
    }
  }

  await storeRepo.update(storeId, { onboardingCompleted: true })
  revalidateTag(TAGS.stores, 'default')
  if (seedProducts) revalidateTag(TAGS.products, 'default')
  redirect('/dashboard')
}
