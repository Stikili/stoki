'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { BundleComponentRepository } from '@/infrastructure/supabase/repositories/BundleComponentRepository'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store }
}

export async function saveBundleComponentsAction(
  bundleId: string,
  components: { componentId: string; qty: number }[],
) {
  const { supabase, store } = await getContext()
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
