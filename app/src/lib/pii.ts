/**
 * PII hashing — one-way deterministic hash for SA ID numbers.
 *
 * Used at the point of employee creation/edit: raw ID enters the server
 * action, the hash + last 4 digits go to the DB, the raw value is
 * discarded. The salt is project-wide (env `PII_SALT`) — same salt
 * means the same ID always hashes to the same value, so we can detect
 * "is this employee already enrolled?". A per-employee salt would force
 * a full-table scan to answer that.
 *
 * Salt is read once at module load. If `PII_SALT` is unset in production
 * the module throws on first hash call — fail closed rather than silently
 * use a default that wouldn't match what's already in the DB.
 */

import { createHash } from 'crypto'

const SALT = process.env.PII_SALT ?? (
  process.env.NODE_ENV === 'production'
    ? '__missing__'   // sentinel — see hashPii guard below
    : 'stoki-pii-salt-v1'  // dev/test default — MUST match the salt baked
                            // into migration 033's backfill UPDATE statement,
                            // otherwise local-dev hashes won't line up with
                            // hashes already in the shared dev Supabase.
)

/** SHA-256 hex digest of `salt + raw`. Deterministic per (salt, raw) pair. */
export function hashPii(raw: string): string {
  if (SALT === '__missing__') {
    throw new Error(
      '[pii] PII_SALT env var not set in production. Refusing to hash — ' +
      'any hash produced now would not match the DB and ID lookups would ' +
      'silently fail. Set PII_SALT (Vercel Project Settings → Env Vars) ' +
      'to the same value used in migration 033.',
    )
  }
  return createHash('sha256').update(SALT + raw).digest('hex')
}

/** Extract the last 4 characters of a numeric string. Used for UI display
 *  ("•••• 5678") so the owner can identify an employee without exposing
 *  the full ID. Returns null for inputs shorter than 4 chars. */
export function last4(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length < 4) return null
  return trimmed.slice(-4)
}

/** Mask a last-4 fragment for display. `last4Of('1234')` → `'•••• 1234'`. */
export function maskedId(last: string | null): string {
  if (!last) return '—'
  return `•••• ${last}`
}
