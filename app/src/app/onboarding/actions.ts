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

  let storeId: string
  if (!isNew && allStores.length === 1 && allStores[0].name === 'My Store') {
    // First-time user finishing onboarding — repurpose the auto-created
    // "My Store" row. grandfathered_until is already set on bootstrap, so
    // no trial stamp needed here.
    const updated = await storeRepo.update(allStores[0].id, { name, phone, category, onboardingCompleted: false })
    storeId = updated.id
  } else {
    // "Add another store" path — owner explicitly wants a second/third.
    // Plan gate by current store count vs Business-tier minimum.
    if (allStores.length >= 1 && !hasFeature(allStores[0], 'store.create.beyond_1')) {
      return { storeId: '', locked: 'store.create.beyond_1', error: 'Multi-store is a Business feature.' }
    }
    if (allStores.length >= 3 && !hasFeature(allStores[0], 'store.create.beyond_3')) {
      return { storeId: '', locked: 'store.create.beyond_3', error: 'Up to 3 stores on Business — talk to us about Enterprise.' }
    }
    const newStore = await storeRepo.create(user.id, name, phone)
    // Additional stores added via the multi-store gate inherit the same
    // grandfather window as the user's first store so the trial / paywall
    // experience stays consistent.
    await storeRepo.update(newStore.id, {
      category,
      onboardingCompleted: false,
      grandfatheredUntil: allStores[0]?.grandfatheredUntil ?? null,
    })
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
  raw: { lat?: string; lng?: string; cashBalance?: string },
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
