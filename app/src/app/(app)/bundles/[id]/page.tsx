import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerData } from '@/lib/getServerData'
import { getCachedProducts } from '@/lib/cached-queries'
import { BundleComponentRepository } from '@/infrastructure/supabase/repositories/BundleComponentRepository'
import RestrictedNotice from '@/components/RestrictedNotice'
import BundleEditClient from './BundleEditClient'

export default async function BundleEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { supabase, store, role } = await getServerData()

  if (role === 'cashier') {
    return (
      <RestrictedNotice
        title="Bundles are restricted"
        description="Configuring combo bundles is available to managers and the store owner."
      />
    )
  }

  const { id } = await params
  const products = await getCachedProducts(store.id)
  const bundle = products.find((p) => p.id === id)
  if (!bundle || !bundle.isBundle) notFound()

  const bundleRepo = new BundleComponentRepository(supabase)
  // Pre-migration-013 fallback so the page still loads if the SQL hasn't run.
  const components = await bundleRepo.findByBundle(store.id, bundle.id).catch(() => [])

  return (
    <div className="px-4 pt-6 pb-4">
      <Link href="/inventory" className="text-muted text-xs">← Inventory</Link>
      <BundleEditClient
        bundle={bundle}
        products={products.filter((p) => !p.isBundle && p.id !== bundle.id)}
        components={components}
      />
    </div>
  )
}
