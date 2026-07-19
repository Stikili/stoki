/**
 * Early-interest signup against a paid tier that isn't yet purchasable.
 *
 * Used on /pricing while Ozow billing is stashed — visitors leave an
 * email against the plan they'd take if it were available. Once the
 * paid tier goes live, we email everyone on the list.
 */
export type WaitlistPlan = 'pro' | 'business' | 'enterprise'

export interface WaitlistSignup {
  id: string
  email: string
  plan: WaitlistPlan
  notes: string | null
  createdAt: string
}

export interface NewWaitlistSignup {
  email: string
  plan: WaitlistPlan
  notes?: string | null
}

export function isValidWaitlistPlan(v: unknown): v is WaitlistPlan {
  return v === 'pro' || v === 'business' || v === 'enterprise'
}

/** Loose email format check — mirror of the DB CHECK constraint so
 *  the API can reject before hitting Postgres. Not RFC-perfect; the
 *  DB constraint is the authoritative gate. */
export function isPlausibleEmail(v: unknown): v is string {
  if (typeof v !== 'string') return false
  const trimmed = v.trim()
  if (trimmed.length < 5 || trimmed.length > 254) return false
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)
}
