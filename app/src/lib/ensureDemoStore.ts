import type { SupabaseClient, User } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { seedDemoStore } from '@/application/demo/seedDemoStore'
import { TAGS } from '@/lib/cache-tags'

/**
 * Ensure every signed-in user has been offered a demo store at some point.
 *
 * Tracked via `user_metadata.demo_seeded` rather than a per-user count of
 * is_demo stores — that way if the user deletes the demo we don't keep
 * recreating it. The flag is set after a successful seed; failures are
 * swallowed so a flaky network doesn't block the dashboard from rendering.
 *
 * Called from getServerData on every dashboard load. The early-return when
 * the flag is already set keeps the cost to a single getUser() call (which
 * has happened anyway) — no DB roundtrips for returning users.
 */
export async function ensureDemoStore(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'user_metadata'>,
): Promise<void> {
  // Already seeded for this user — including users who chose to delete the
  // demo afterwards. We respect that decision.
  if (user.user_metadata?.demo_seeded) return

  try {
    await seedDemoStore(supabase, user.id)
    await supabase.auth.updateUser({ data: { demo_seeded: true } })
    // Bust the cached stores list so the just-created demo shows up on the
    // dashboard immediately, not on the next refresh.
    revalidateTag(TAGS.stores, 'default')
  } catch (e) {
    // Don't block the dashboard if the seed fails — log and continue.
    // Most likely cause: pre-migration-018 environment without the is_demo
    // column. The next deploy + dashboard load retries automatically.
    console.warn('[ensureDemoStore] seed failed:', e)
  }
}
