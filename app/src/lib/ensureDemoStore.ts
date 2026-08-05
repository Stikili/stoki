import type { SupabaseClient, User } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { seedDemoStores } from '@/application/demo/seedDemoStore'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { TAGS } from '@/lib/cache-tags'

/**
 * Ensure every signed-in user has been seeded with the demo stores. Currently
 * seeds THREE demo stores (a Soweto spaza, a VAT-registered Cape Town
 * mini-market, and a Gqeberha professional-services firm) so users can
 * compare verticals and see every Stoki feature populated with realistic
 * data — including the non-retail case.
 *
 * ## Versioning
 *
 * Tracked via `user_metadata.demo_seeded_v4`. The flag is bumped (rather
 * than just toggled) every time we want to force a clean re-seed across
 * existing accounts — each version represents a hard reset.
 *
 *   v1: single "Stoki Demo Shop"
 *   v2: two demo stores, but in some accounts left v1 leftovers behind
 *       because the cleanup was conditional on v1Done
 *   v3: unconditional cleanup — any is_demo store the user owns is
 *       soft-deleted before the pair is seeded, regardless of which
 *       prior version (if any) was applied
 *   v4: adds the professional-services store, so every account has a
 *       non-retail demo
 *
 * Users who deleted their demos are respected only until the next version
 * bump — v4 re-seeds them. That is the accepted cost of the hard-reset
 * design: there is no separate "opted out" flag distinguishing "deleted
 * these on purpose" from "never had the new one". Worth adding if demo
 * deletion turns out to be common.
 *
 * ## Failure semantics
 *
 * Failures are swallowed so a flaky network or pre-migration schema doesn't
 * block the dashboard. Called from getServerData on every dashboard load,
 * so the next render retries automatically.
 */
export async function ensureDemoStore(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'user_metadata'>,
): Promise<void> {
  const meta = user.user_metadata ?? {}
  const v4Done = meta.demo_seeded_v4 === true

  // Already on the v4 seed — nothing to do.
  if (v4Done) return

  try {
    // Use the service-role (admin) client for the seed. Reason: when a brand-
    // new store is created, the caller has no `store_users` membership row
    // for it yet, but the multi-user RLS policies (since migration 008) check
    // membership for every store-scoped table. The user-scoped client can
    // create the store row (owner_id check), but every subsequent insert
    // (products, suppliers, sales, etc.) gets blocked by RLS. The admin
    // client bypasses RLS during bootstrap; we still scope every insert
    // explicitly to `store_id`/`owner_id = user.id` so there's no leakage.
    const admin = createAdminClient()

    // Unconditional cleanup: soft-delete every is_demo store the caller
    // owns, regardless of which prior seed version it came from. This
    // collapses any duplicates / leftover-from-partial-failure rows so the
    // user always lands on exactly the stores in DEMO_PROFILES.
    //
    // Soft-delete is safe: stores carry a `deleted_at` column and all
    // RLS-aware queries filter it. We don't hard-delete because cascading
    // deletes across sales/products/etc. would be slow and non-atomic.
    await admin
      .from('stores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('owner_id', user.id)
      .eq('is_demo', true)
      .is('deleted_at', null)

    await seedDemoStores(admin, user.id)

    // Stamp every prior flag too so any intermediate code path that still
    // reads them stays consistent.
    await supabase.auth.updateUser({
      data: {
        demo_seeded: true,
        demo_seeded_v2: true,
        demo_seeded_v3: true,
        demo_seeded_v4: true,
      },
    })

    // Bust the cached stores list so the just-created demos show up on the
    // dashboard immediately, not on the next refresh.
    revalidateTag(TAGS.stores, 'default')
  } catch (e) {
    console.warn('[ensureDemoStore] seed failed:', e)
  }
}
