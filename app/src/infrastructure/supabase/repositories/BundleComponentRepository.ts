import { SupabaseClient } from '@supabase/supabase-js'
import { IBundleComponentRepository } from '@/domain/repositories/IBundleComponentRepository'
import { BundleComponent, NewBundleComponent } from '@/domain/entities/bundle'
import { toBundleComponent } from '../mappers'

export class BundleComponentRepository implements IBundleComponentRepository {
  constructor(private db: SupabaseClient) {}

  async findByBundle(storeId: string, bundleId: string): Promise<BundleComponent[]> {
    // Join the component product so callers can compute bundleCost /
    // bundlesAvailable without a second round-trip.
    const { data, error } = await this.db
      .from('bundle_components')
      .select('*, component:component_id(name, cost, qty)')
      .eq('store_id', storeId)
      .eq('bundle_id', bundleId)
      .order('created_at')

    if (error) throw new Error(error.message)
    return (data ?? []).map(toBundleComponent)
  }

  async replaceAll(storeId: string, bundleId: string, components: NewBundleComponent[]): Promise<void> {
    // Wholesale replace — delete then insert. Acceptable for SMME-scale
    // bundles (handful of components per bundle, edited rarely).
    const { error: delErr } = await this.db
      .from('bundle_components')
      .delete()
      .eq('store_id', storeId)
      .eq('bundle_id', bundleId)
    if (delErr) throw new Error(delErr.message)

    if (components.length === 0) return

    const rows = components.map((c) => ({
      store_id: storeId,
      bundle_id: bundleId,
      component_id: c.componentId,
      qty: c.qty,
    }))
    const { error: insErr } = await this.db.from('bundle_components').insert(rows)
    if (insErr) throw new Error(insErr.message)
  }
}
