'use server'

import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import { TAGS } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { setSelectedStoreId } from '@/lib/selectedStore'
import { StoreCategory } from '@/domain/entities/store'

// Step 2: save name + category, return the storeId (no redirect — client handles next step)
export async function saveStoreAction(formData: FormData): Promise<{ storeId: string }> {
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
    const updated = await storeRepo.update(allStores[0].id, { name, phone, category, onboardingCompleted: false })
    storeId = updated.id
  } else {
    const newStore = await storeRepo.create(user.id, name, phone)
    await storeRepo.update(newStore.id, { category, onboardingCompleted: false })
    storeId = newStore.id
  }
  await setSelectedStoreId(storeId)
  revalidateTag(TAGS.stores, 'default')
  return { storeId }
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
