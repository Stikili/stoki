'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { TAGS , invalidateDashboard } from '@/lib/cache-tags'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { StocktakeRepository } from '@/infrastructure/supabase/repositories/StocktakeRepository'
import { completeStocktake } from '@/application/inventory/completeStocktake'
import { getServerData } from '@/lib/getServerData'
import { assertNotCashier } from '@/lib/role-guards'

export interface SubmitStocktakeResult {
  ok: true
  variancesAdjusted: number
  totalVarianceValue: number
}

/**
 * Stocktake writes variance adjustments straight to product qty and
 * captures a P&L-affecting audit line — manager+ operation. Cashiers
 * running the till shouldn't be able to reconcile the shelf count
 * against the system count.
 */
export async function submitStocktakeAction(
  counts: Record<string, number>,
  notes?: string,
): Promise<SubmitStocktakeResult> {
  const { supabase, store, user, role } = await getServerData()
  assertNotCashier(role, 'submit a stocktake')
  const productRepo = new ProductRepository(supabase)
  const stocktakeRepo = new StocktakeRepository(supabase)

  const stocktake = await completeStocktake(productRepo, stocktakeRepo, store.id, user.id, {
    counts,
    notes,
  })

  const variancesAdjusted = stocktake.lines.filter((l) => l.variance !== 0).length
  const totalVarianceValue = stocktake.lines.reduce(
    (sum, l) => sum + l.variance * l.costPerUnit,
    0,
  )

  revalidateTag(TAGS.products, 'default')
  revalidatePath('/stocktake')
  revalidatePath('/inventory')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)

  return { ok: true, variancesAdjusted, totalVarianceValue }
}
