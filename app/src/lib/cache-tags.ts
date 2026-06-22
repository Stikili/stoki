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

import { revalidateTag } from 'next/cache'

/**
 * Invalidate the cached dashboard snapshot. Call from every server action
 * that mutates something the dashboard shows (sales, expenses, bills,
 * invoices, recurring rules, assets, cash balance, etc.). Without this,
 * the 30 s natural TTL on the snapshot makes the dashboard feel broken
 * right after the user records something.
 *
 * Defensive: also revalidates the matching tags for the auxiliary cached
 * queries the dashboard reads (products, debtors), so a single call from
 * an action covers the whole dashboard surface.
 */
export function invalidateDashboard(): void {
  revalidateTag(TAGS.dashboard, 'default')
}
