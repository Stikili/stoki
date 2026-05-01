import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { toProduct } from '@/infrastructure/supabase/mappers'
import { toDebtor } from '@/infrastructure/supabase/mappers'
import { toStore } from '@/infrastructure/supabase/mappers'
import { withStatus, ProductWithStatus } from '@/domain/entities/product'
import { Debtor } from '@/domain/entities/debtor'
import { Store } from '@/domain/entities/store'
import { TAGS } from './cache-tags'

/**
 * Products for a store — cached until revalidateTag('products').
 * Returns mapped domain entities with stock status.
 */
export const getCachedProducts = unstable_cache(
  async (storeId: string): Promise<ProductWithStatus[]> => {
    const db = createAdminClient()
    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []).map(toProduct).map(withStatus)
  },
  [TAGS.products],
  { tags: [TAGS.products], revalidate: 3600 }
)

/**
 * Debtors for a store — cached until revalidateTag('debtors').
 * Does NOT include credit entries (those are always fetched fresh).
 */
export const getCachedDebtors = unstable_cache(
  async (storeId: string): Promise<Debtor[]> => {
    const db = createAdminClient()
    const { data, error } = await db
      .from('debtors')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []).map(toDebtor)
  },
  [TAGS.debtors],
  { tags: [TAGS.debtors], revalidate: 3600 }
)

/**
 * All stores the user has access to — owned OR invited as a team member.
 * Cached until revalidateTag('stores').
 *
 * Pre-migration-008 fallback: if store_users doesn't exist yet, fall back to the
 * old owner_id-based lookup so the app keeps working until the migration is run.
 */
export const getCachedStores = unstable_cache(
  async (userId: string): Promise<Store[]> => {
    const db = createAdminClient()
    const { data, error } = await db
      .from('store_users')
      .select('stores(*)')
      .eq('user_id', userId)

    if (!error) {
      type Row = { stores: unknown }
      const rows = (data ?? []) as unknown as Row[]
      return rows
        .map(r => r.stores)
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((s: any) => s.deleted_at == null)
        .map(toStore)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }

    // Fallback path — store_users table missing.
    const { data: ownedRows, error: ownedErr } = await db
      .from('stores')
      .select('*')
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .order('created_at')
    if (ownedErr) throw new Error(ownedErr.message)
    return (ownedRows ?? []).map(toStore)
  },
  [TAGS.stores],
  { tags: [TAGS.stores], revalidate: 3600 }
)
