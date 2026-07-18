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
 * Atomic check-and-increment via the `check_and_increment_advisor_usage`
 * RPC (migration 038). Closes BUG-009 from the 2026-07-18 code review:
 * the previous pattern of `checkAdvisorBudget` (SELECT) then LLM call
 * then `recordAdvisorUse` (INCREMENT) had a race window where N
 * concurrent burst requests all passed the SELECT before any INCREMENT
 * landed, silently bypassing the daily cap.
 *
 * This RPC does INSERT-with-conditional-INCREMENT in one statement,
 * with row-level locking on the (user_id, day) tuple — concurrent
 * callers serialise and the (limit-1)th caller gets `allowed=false`
 * with no LLM cost burned.
 *
 * Semantic change vs. the old check → LLM → record: the counter
 * increments BEFORE the LLM call, so a failed LLM call still burns
 * one quota unit. Accepted trade-off — the alternative is a
 * bypassable cap.
 *
 * Falls back to the old pattern if the RPC isn't available (i.e.
 * migration 038 not yet applied) so this stays non-breaking.
 */
export async function checkAndReserveAdvisorSlot(
  supabase: SupabaseClient,
  userId: string,
  effectivePlan: Plan = 'free',
): Promise<MeterDecision> {
  const limit = advisorDailyLimit(effectivePlan)
  const day = today()
  try {
    const { data, error } = await supabase.rpc('check_and_increment_advisor_usage', {
      p_user_id: userId,
      p_day: day,
      p_limit: limit,
    })
    if (error) throw error
    // Postgres RPC returns TABLE (allowed bool, used int) — Supabase
    // gives us the first row.
    const row = Array.isArray(data) ? data[0] : data
    const allowed: boolean = row?.allowed ?? false
    const used: number = row?.used ?? 0
    if (!allowed) {
      const message = effectivePlan === 'free'
        ? `${limit} questions a day to chat with stoki — upgrade for unlimited. Resets at midnight.`
        : `You've hit today's advisor limit (${limit} questions). Resets at midnight — contact us if you need more.`
      return { ok: false, used, limit, message }
    }
    return { ok: true, used, limit }
  } catch {
    // RPC not deployed (migration 038 not applied) — fall back to the
    // old check-then-record pattern. Race window returns but at least
    // the daily cap is still enforced approximately.
    const decision = await checkAdvisorBudget(supabase, userId, effectivePlan)
    if (decision.ok) {
      void recordAdvisorUse(supabase, userId)
    }
    return decision
  }
}

/**
 * @deprecated Prefer `checkAndReserveAdvisorSlot` — it's atomic and
 * closes the check→LLM→record race. This function is kept for the
 * fallback path inside checkAndReserveAdvisorSlot and any legacy
 * callers that haven't been migrated.
 */
export async function recordAdvisorUse(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const day = today()
  try {
    const { error } = await supabase.rpc('increment_advisor_usage', {
      p_user_id: userId,
      p_day: day,
    })
    if (!error) return
    // RPC missing or errored — fall back below.
  } catch { /* fall through */ }

  // Fallback path — race-prone but non-breaking. Same code as before
  // migration 034 so this works pre-migration.
  try {
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

/** Global daily cap across ALL users. Tunable via env. Once hit, the
 *  advisor returns a maintenance-style message instead of calling the
 *  LLM — protects against the "10 000 users hit their free quota
 *  the same day" cost-explosion scenario. */
export const ADVISOR_GLOBAL_DAILY_LIMIT = Number(
  process.env.ADVISOR_GLOBAL_DAILY_LIMIT ?? 50_000,
)

/**
 * Check whether the SYSTEM has any LLM budget left today. Sums today's
 * row counts across every user; if the total has hit the global ceiling,
 * blocks all advisor requests until UTC midnight. Fail-open on DB
 * errors (same philosophy as the per-user budget).
 */
export async function checkGlobalAdvisorBudget(
  supabase: SupabaseClient,
): Promise<MeterDecision> {
  const limit = ADVISOR_GLOBAL_DAILY_LIMIT
  try {
    // Sum the `count` column across every user for today. We fetch the
    // rows and sum in JS — at our scale today's row count is bounded
    // by the user-base size (one row per active user per day) so this
    // is cheap. If/when row count exceeds a few thousand, switch to a
    // SQL-side SUM via an RPC.
    const { data } = await supabase
      .from('ai_advisor_usage')
      .select('count')
      .eq('day', today())
    const total = (data ?? []).reduce(
      (sum: number, row: { count: number | null }) => sum + (row.count ?? 0),
      0,
    )
    if (total >= limit) {
      return {
        ok: false,
        used: total,
        limit,
        message: 'Stoki AI is taking a short break — too many questions today across all shops. Back at midnight UTC.',
      }
    }
    return { ok: true, used: total, limit }
  } catch {
    return { ok: true, used: 0, limit }
  }
}
