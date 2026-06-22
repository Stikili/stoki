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

/** Per-store tag for dashboard + reports snapshot caches.
 *  Use as the tag value in unstable_cache options so revalidation only
 *  affects the calling store, not every store on the system. */
export function dashboardTag(storeId: string): string {
  return `dashboard:${storeId}`
}

/**
 * Invalidate the cached dashboard + reports snapshots for a SINGLE store.
 * Call from every server action that mutates something the dashboard
 * shows (sales, expenses, bills, invoices, recurring rules, assets, cash
 * balance, etc.).
 *
 * Per-store scoping matters at multi-tenant scale: a global revalidateTag
 * (the previous design) would wipe every store's cache on every mutation
 * anywhere on the system — cache hit rate collapses and the Supabase
 * connection pool becomes the bottleneck. Tagging per-store keeps
 * invalidation surgical.
 */
export function invalidateDashboard(storeId: string): void {
  revalidateTag(dashboardTag(storeId), 'default')
}
