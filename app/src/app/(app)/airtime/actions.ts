'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { TAGS , invalidateDashboard } from '@/lib/cache-tags'
import { AirtimePinRepository } from '@/infrastructure/supabase/repositories/AirtimePinRepository'
import { parseAirtimePinCsv } from '@/lib/csv-airtime'
import { getServerData } from '@/lib/getServerData'
import { assertNotCashier } from '@/lib/role-guards'

export interface UploadPinsResult {
  inserted: number
  skipped: number
  errors: { line: number; message: string }[]
}

/**
 * Airtime PIN uploads bring in cash-equivalent inventory (each PIN is
 * a resellable voucher worth face value) — manager+ operation. Cashiers
 * DISPENSE PINs on sale via the till flow, but only managers should
 * bulk-upload new voucher batches from a supplier's CSV.
 */
export async function uploadAirtimePinsAction(productId: string, csv: string): Promise<UploadPinsResult> {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'upload airtime PINs')
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
  invalidateDashboard(store.id)

  return { inserted, skipped, errors: parsed.errors }
}
