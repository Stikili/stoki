/**
 * Per-user daily AI advisor token / message meter.
 *
 * Without a cap, free-tier users with chatty advisor flows can burn meaningful
 * LLM budget. The meter gives each user a per-day allowance; over the limit,
 * the advisor returns a polite throttle message instead of calling the LLM.
 *
 * Implementation is intentionally lightweight — a single `ai_advisor_usage`
 * table with one row per (user_id, date). Increment after each request; check
 * before. The store is the user's auth.users.id; we don't try to track it
 * per-store because the cost is borne by the SaaS operator, not the shop.
 *
 * If the table doesn't exist (migration not yet applied), every check
 * returns "ok" so this is a non-breaking addition.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from '@/domain/entities/store'
import { advisorDailyLimit } from './plan-gates'

/** Daily advisor message limit per user (free tier). Tune in env.
 *  Default of 10 is the conversion-aware target — high enough to feel
 *  useful on day one, low enough that heavy daily users hit the cap and
 *  see an upgrade prompt. Pro/Business resolve through plan-gates.ts so
 *  they get a much higher (effectively unlimited) ceiling. */
export const ADVISOR_DAILY_LIMIT = Number(process.env.ADVISOR_DAILY_LIMIT ?? 10)

export interface MeterDecision {
  ok: boolean
  used: number
  limit: number
  /** Friendly message to surface when ok=false. */
  message?: string
}

/** Today's UTC date in YYYY-MM-DD form (good enough granularity for daily caps). */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Check whether the user can send another advisor request today. Does not
 * mutate the count — call `recordAdvisorUse` after a successful response.
 *
 * The `effectivePlan` argument is resolved by the caller via
 * `lib/effective-plan.ts` so this function stays pure and trivial to test.
 * Grandfathered free users come in as 'pro' and get the higher limit.
 */
export async function checkAdvisorBudget(
  supabase: SupabaseClient,
  userId: string,
  effectivePlan: Plan = 'free',
): Promise<MeterDecision> {
  const limit = advisorDailyLimit(effectivePlan)
  try {
    const { data } = await supabase
      .from('ai_advisor_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('day', today())
      .maybeSingle()
    const used: number = (data?.count as number | undefined) ?? 0
    if (used >= limit) {
      const message = effectivePlan === 'free'
        ? `${limit} questions a day to chat with stoki — upgrade for unlimited. Resets at midnight.`
        : `You've hit today's advisor limit (${limit} questions). Resets at midnight — contact us if you need more.`
      return { ok: false, used, limit, message }
    }
    return { ok: true, used, limit }
  } catch {
    // Table missing or query failed — fail open so we never block on a
    // missing migration. Caller can still proceed.
    return { ok: true, used: 0, limit }
  }
}

/**
 * Increment today's count for `userId`. Idempotent at the DB level via
 * upsert on (user_id, day). Best-effort — failures are swallowed (we'd
 * rather under-charge than block the response).
 */
export async function recordAdvisorUse(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    // Atomic increment via RPC if it exists; else fall back to upsert+update.
    // We use a simple read-modify-write here because the volumes are tiny
    // (single-user concurrent advisor requests are rare) and adding a SQL
    // function is more migration churn than it's worth.
    const day = today()
    const { data: existing } = await supabase
      .from('ai_advisor_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('day', day)
      .maybeSingle()
    const next = (((existing?.count as number | undefined) ?? 0)) + 1
    await supabase
      .from('ai_advisor_usage')
      .upsert(
        { user_id: userId, day, count: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,day' },
      )
  } catch { /* non-fatal */ }
}
