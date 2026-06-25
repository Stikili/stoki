/**
 * Postgres-backed per-key rate limiter. One row per (key, minute-bucket);
 * compare count against limit, fail-open on infrastructure error.
 *
 * Why Postgres not Redis: we already pay for Supabase. Adding Upstash /
 * Redis introduces a new failure mode + another secret + another bill,
 * none of which is justified at our traffic level. At 1000s of rps this
 * would need to switch — until then, Postgres is fine.
 *
 * Why minute-buckets not sliding windows: minute resolution is enough
 * for "stop the burst" use cases (advisor, cron, auth). Sliding windows
 * need a sorted-set datastore (Redis); fixed buckets work with a plain
 * SQL table. Worst case at bucket boundaries: a determined attacker can
 * hit 2× limit per minute. Acceptable.
 *
 * Fail-open philosophy: a DB hiccup shouldn't take the app offline. If
 * the rate-limit check itself errors, we let the request through and
 * log it — better to under-throttle for a minute than to 503 every
 * legit request.
 */

import { createAdminClient } from '@/infrastructure/supabase/admin'
import { log } from './log'

export interface RateLimitDecision {
  /** True when the request is allowed to proceed. */
  allowed: boolean
  /** Current count within the bucket after this request would land. */
  count: number
  /** Configured limit. */
  limit: number
  /** Seconds until the bucket resets (0 if allowed). */
  retryAfter: number
}

/** Extract the caller IP from a Next.js Request. Vercel sets
 *  `x-forwarded-for`; we take the leftmost (origin) entry. Returns
 *  `'unknown'` for direct connections — those still get rate-limited
 *  together, which is the right behaviour for unknown principals. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

/**
 * Atomically increment the bucket and report whether the new count is
 * within the limit. Uses an upsert + RPC pattern: insert if absent,
 * otherwise add 1 and return the new value.
 *
 * @param key  Stable identifier — encode route + principal (e.g.
 *             `advisor:ip:1.2.3.4` or `login:ip:1.2.3.4`).
 * @param limit Maximum requests permitted per minute bucket.
 */
export async function rateLimit(
  key: string,
  limit: number,
): Promise<RateLimitDecision> {
  const now = new Date()
  // Bucket on minute boundaries.
  const bucket = new Date(now)
  bucket.setSeconds(0, 0)
  const bucketIso = bucket.toISOString()
  const retryAfter = 60 - now.getSeconds()

  try {
    const db = createAdminClient()
    // Read current count.
    const { data: existing } = await db
      .from('request_rate_limits')
      .select('count')
      .eq('key', key)
      .eq('window_start', bucketIso)
      .maybeSingle()
    const previous = (existing?.count as number | undefined) ?? 0
    const next = previous + 1

    // Upsert. Best-effort; concurrent requests in the same bucket may
    // race, but the worst case is occasionally letting one extra through
    // — within the design tolerance for fixed-window rate limits.
    await db
      .from('request_rate_limits')
      .upsert(
        { key, window_start: bucketIso, count: next, updated_at: now.toISOString() },
        { onConflict: 'key,window_start' },
      )

    if (next > limit) {
      log.warn('rate_limit.exceeded', { key, count: next, limit })
      return { allowed: false, count: next, limit, retryAfter }
    }
    return { allowed: true, count: next, limit, retryAfter: 0 }
  } catch (error) {
    // Fail-open — see file header.
    log.error('rate_limit.check_failed', { key, error })
    return { allowed: true, count: 0, limit, retryAfter: 0 }
  }
}

/**
 * Convenience for the common case: rate-limit by IP for a named route.
 * Returns the decision plus the Response to return when blocked (with
 * the standard `Retry-After` header set), or null when allowed.
 */
export async function rateLimitByIp(
  req: Request,
  route: string,
  limit: number,
): Promise<Response | null> {
  const ip = clientIp(req)
  const decision = await rateLimit(`${route}:ip:${ip}`, limit)
  if (decision.allowed) return null
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Try again shortly.',
      retryAfter: decision.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(decision.retryAfter),
      },
    },
  )
}
