'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerData } from '@/lib/getServerData'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
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

export async function deleteStoreAction(storeId: string) {
  const { supabase, allStores } = await getServerData()

  if (allStores.length <= 1) return // never delete the last store

  const storeRepo = new StoreRepository(supabase)
  await storeRepo.delete(storeId)

  revalidateTag(TAGS.stores, 'default')
  revalidatePath('/', 'layout')
  redirect('/stores')
}
