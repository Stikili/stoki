export interface BundleComponent {
  id: string
  storeId: string
  bundleId: string
  componentId: string
  /** Component product info — joined for display. May be missing when the
   *  caller fetched without a join (count queries, etc.). */
  componentName: string | null
  componentCost: number | null
  componentQty: number | null
  /** How many units of the component are needed for one bundle sale. */
  qty: number
  createdAt: string
}

export interface NewBundleComponent {
  componentId: string
  qty: number
}

/**
 * Total cost of one bundle = sum of (component qty × component cost) across all
 * components. Returns 0 when components don't have cost data attached.
 */
export function bundleCost(components: Pick<BundleComponent, 'qty' | 'componentCost'>[]): number {
  return components.reduce((sum, c) => sum + c.qty * (c.componentCost ?? 0), 0)
}

/**
 * How many bundles can be sold given current component stock?
 * Limited by whichever component runs out first.
 * Returns Infinity when the bundle has no components defined (caller should
 * treat that as "not yet configured" and refuse to sell).
 */
export function bundlesAvailable(components: Pick<BundleComponent, 'qty' | 'componentQty'>[]): number {
  if (components.length === 0) return Infinity
  let min = Infinity
  for (const c of components) {
    if (c.componentQty == null) continue
    const possible = Math.floor(c.componentQty / c.qty)
    if (possible < min) min = possible
  }
  return min === Infinity ? 0 : min
}
