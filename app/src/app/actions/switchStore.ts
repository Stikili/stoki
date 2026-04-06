'use server'

import { revalidatePath } from 'next/cache'
import { setSelectedStoreId } from '@/lib/selectedStore'

export async function switchStoreAction(storeId: string) {
  await setSelectedStoreId(storeId)
  revalidatePath('/', 'layout')
}
