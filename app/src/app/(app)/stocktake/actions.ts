'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { TAGS , invalidateDashboard } from '@/lib/cache-tags'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { StocktakeRepository } from '@/infrastructure/supabase/repositories/StocktakeRepository'
import { completeStocktake } from '@/application/inventory/completeStocktake'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store, userId: user.id }
}

export interface SubmitStocktakeResult {
  ok: true
  variancesAdjusted: number
  totalVarianceValue: number
}

export async function submitStocktakeAction(
  counts: Record<string, number>,
  notes?: string,
): Promise<SubmitStocktakeResult> {
  const { supabase, store, userId } = await getContext()
  const productRepo = new ProductRepository(supabase)
  const stocktakeRepo = new StocktakeRepository(supabase)

  const stocktake = await completeStocktake(productRepo, stocktakeRepo, store.id, userId, {
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
