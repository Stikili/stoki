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

  if (!name) return

  const storeRepo = new StoreRepository(supabase)
  await storeRepo.update(store.id, { name, phone, location, whatsappNumber })

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
