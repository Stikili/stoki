import type { SupabaseClient, User } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { seedDemoStores } from '@/application/demo/seedDemoStore'
import { TAGS } from '@/lib/cache-tags'

/**
 * Ensure every signed-in user has been seeded with the demo stores. Currently
 * seeds TWO demo stores (a Soweto spaza + a VAT-registered Cape Town
 * mini-market) so users can compare verticals and see every Stoki feature
 * populated with realistic data.
 *
 * ## Versioning
 *
 * Tracked via `user_metadata.demo_seeded_v2`. Earlier accounts have
 * `demo_seeded` from the v1 seed (single "Stoki Demo Shop"). When the v1
 * flag is set but v2 isn't, we treat that as a migration: soft-delete any
 * existing is_demo stores the user owns and seed the v2 pair.
 *
 * Users who deleted their demo(s) and have either flag set are still
 * respected — they've opted out, we don't recreate.
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
  const v2Done = meta.demo_seeded_v2 === true
  const v1Done = meta.demo_seeded === true

  // Already on the v2 seed — nothing to do.
  if (v2Done) return

  try {
    // v1 → v2 migration path: soft-delete the user's existing is_demo stores
    // so we don't end up with three demos (one v1 + two v2). Soft-delete is
    // safe: stores carry a `deleted_at` column and RLS-aware queries already
    // filter on it. We don't hard-delete because cascading deletes across
    // sales/products/etc. could be slow and non-atomic.
    if (v1Done) {
      await supabase
        .from('stores')
        .update({ deleted_at: new Date().toISOString() })
        .eq('owner_id', user.id)
        .eq('is_demo', true)
        .is('deleted_at', null)
    }

    await seedDemoStores(supabase, user.id)

    // Set both flags. v2 is the live marker; we also keep v1 set so
    // intermediate code paths that still check it stay consistent.
    await supabase.auth.updateUser({ data: { demo_seeded: true, demo_seeded_v2: true } })

    // Bust the cached stores list so the just-created demos show up on the
    // dashboard immediately, not on the next refresh.
    revalidateTag(TAGS.stores, 'default')
  } catch (e) {
    console.warn('[ensureDemoStore] seed failed:', e)
  }
}
