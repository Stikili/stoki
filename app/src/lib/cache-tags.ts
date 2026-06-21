/**
 * Cache tag constants used by unstable_cache and revalidateTag.
 * Changing a tag name here is the only place needed to update the cache key.
 */
export const TAGS = {
  /** Product catalog — invalidated on add/restock/archive */
  products: 'products',
  /** Debtors list — invalidated on create/credit/settle */
  debtors: 'debtors',
  /** Store config — invalidated on settings update, store create/delete */
  stores: 'stores',
  /** Dashboard snapshot — invalidated on any sale/expense/bill/invoice change.
   *  Owners refresh dashboard often; caching avoids re-running a 13-way
   *  parallel fetch on every navigation. 30s natural revalidate also limits
   *  staleness without explicit invalidation everywhere. */
  dashboard: 'dashboard',
} as const

export type CacheTag = (typeof TAGS)[keyof typeof TAGS]
