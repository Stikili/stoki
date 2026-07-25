'use server'

import { revalidatePath } from 'next/cache'
import { BundleComponentRepository } from '@/infrastructure/supabase/repositories/BundleComponentRepository'
import { getServerData } from '@/lib/getServerData'
import { assertNotCashier } from '@/lib/role-guards'

/**
 * Bundle-component editing is product-catalogue work — cashier-blocked.
 * Cashiers sell bundles from the till (that goes through recordSale +
 * recordBundleSale) but shouldn't reconfigure what's in a bundle.
 */
export async function saveBundleComponentsAction(
  bundleId: string,
  components: { componentId: string; qty: number }[],
) {
  const { supabase, store, role } = await getServerData()
  assertNotCashier(role, 'edit bundle components')
  const bundleRepo = new BundleComponentRepository(supabase)

  // Filter out invalid rows defensively — UI should already do this but
  // a server-side guard prevents poison rows in the table.
  const cleaned = components
    .filter((c) => c.componentId && Number.isFinite(c.qty) && c.qty > 0)
    .map((c) => ({ componentId: c.componentId, qty: Math.floor(c.qty) }))

  await bundleRepo.replaceAll(store.id, bundleId, cleaned)

  revalidatePath('/bundles')
  revalidatePath(`/bundles/${bundleId}`)
  revalidatePath('/inventory')
}
