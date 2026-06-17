'use server'

import { revalidatePath } from 'next/cache'
import { getServerData } from '@/lib/getServerData'
import { FixedAssetRepository } from '@/infrastructure/supabase/repositories/FixedAssetRepository'
import type { AssetCategory, NewFixedAsset } from '@/domain/entities/fixed-asset'

const VALID_CATEGORIES: AssetCategory[] = ['vehicle', 'fridge', 'equipment', 'furniture', 'computer', 'other']

export async function createAssetAction(
  input: NewFixedAsset,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  if (!input.name.trim()) return { ok: false, error: 'Name is required.' }
  if (!Number.isFinite(input.cost) || input.cost <= 0) return { ok: false, error: 'Cost must be greater than zero.' }
  if (!Number.isFinite(input.usefulLifeMonths) || input.usefulLifeMonths <= 0) {
    return { ok: false, error: 'Useful life must be at least 1 month.' }
  }
  if (!VALID_CATEGORIES.includes(input.category)) {
    return { ok: false, error: 'Invalid category.' }
  }
  if (input.residualValue !== undefined && (!Number.isFinite(input.residualValue) || input.residualValue < 0)) {
    return { ok: false, error: 'Residual value cannot be negative.' }
  }

  const repo = new FixedAssetRepository(supabase)
  try {
    await repo.create(store.id, input)
    revalidatePath('/assets')
    revalidatePath('/reports')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create asset.' }
  }
}

export async function disposeAssetAction(
  id: string,
  disposedAt: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  const repo = new FixedAssetRepository(supabase)
  try {
    await repo.updateStatus(store.id, id, 'disposed', disposedAt)
    revalidatePath('/assets')
    revalidatePath('/reports')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}

export async function archiveAssetAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  const repo = new FixedAssetRepository(supabase)
  try {
    await repo.archive(store.id, id)
    revalidatePath('/assets')
    revalidatePath('/reports')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}
