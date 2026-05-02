import { BundleComponent, NewBundleComponent } from '../entities/bundle'

export interface IBundleComponentRepository {
  /** All components for a given bundle, joined with component product info. */
  findByBundle(storeId: string, bundleId: string): Promise<BundleComponent[]>

  /** Replace the entire component set for a bundle in one go. */
  replaceAll(storeId: string, bundleId: string, components: NewBundleComponent[]): Promise<void>
}
