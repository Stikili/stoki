'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { TAGS } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { AirtimePinRepository } from '@/infrastructure/supabase/repositories/AirtimePinRepository'
import { parseAirtimePinCsv } from '@/lib/csv-airtime'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store }
}

export interface UploadPinsResult {
  inserted: number
  skipped: number
  errors: { line: number; message: string }[]
}

export async function uploadAirtimePinsAction(productId: string, csv: string): Promise<UploadPinsResult> {
  const { supabase, store } = await getContext()
  const pinRepo = new AirtimePinRepository(supabase)

  const parsed = parseAirtimePinCsv(csv)
  if (parsed.rows.length === 0) {
    return { inserted: 0, skipped: 0, errors: parsed.errors }
  }

  let inserted = 0
  let skipped = 0
  // Insert in chunks of 100 so a single bad row doesn't poison the batch.
  const chunkSize = 100
  for (let i = 0; i < parsed.rows.length; i += chunkSize) {
    const chunk = parsed.rows.slice(i, i + chunkSize)
    try {
      inserted += await pinRepo.bulkInsert(store.id, productId, chunk)
    } catch {
      skipped += chunk.length
    }
  }

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/airtime')
  revalidatePath('/sales')
  revalidatePath('/dashboard')

  return { inserted, skipped, errors: parsed.errors }
}
