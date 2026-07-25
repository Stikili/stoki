import type { StoreRole } from '@/domain/entities/store-user'

/**
 * Role-based server-action guards.
 *
 * Pages inside `(app)/` are gated at the route level (see the `if (role
 * === 'cashier') return <RestrictedNotice />` blocks on individual page
 * files), but that stops UI navigation only. A determined cashier with a
 * valid session can still POST to the underlying server action directly
 * via crafted fetch / RSC form-post. RLS at the DB level scopes rows to
 * stores the cashier belongs to, but does NOT stop them calling an
 * owner-scoped action (e.g. deleteExpenseAction) on their own store.
 *
 * These helpers close that gap. Every state-changing server action must
 * call one of them before touching the DB.
 *
 * Two shapes:
 *   - `denyIf*`     → returns a `RoleDenied` object (null on allow).
 *                     Use in actions that already return { ok, error }.
 *   - `assert*`     → throws when denied.
 *                     Use in void-returning actions. Callers catch or the
 *                     framework surfaces the error via the RSC error
 *                     boundary; either way the write never lands.
 *
 * Deny message convention: "{verb}" fills the blank in
 * "Only … can {verb}." Pass a short imperative — "delete an expense",
 * "invite a teammate", "run payroll". Defaults to "do this" so a
 * missing verb still ships a usable message.
 */

export interface RoleDenied {
  ok: false
  error: string
}

/** Cashier can't do this; owners and managers can. Returns null on allow. */
export function denyIfCashier(role: StoreRole, verb = 'do this'): RoleDenied | null {
  if (role === 'cashier') {
    return { ok: false, error: `Only owners and managers can ${verb}.` }
  }
  return null
}

/** Owner-only action. Returns null on allow. */
export function denyIfNotOwner(role: StoreRole, verb = 'do this'): RoleDenied | null {
  if (role !== 'owner') {
    return { ok: false, error: `Only the owner can ${verb}.` }
  }
  return null
}

/** Throwable variant of denyIfCashier. Use in void-returning actions. */
export function assertNotCashier(role: StoreRole, verb = 'do this'): void {
  if (role === 'cashier') {
    throw new RoleDeniedError(`Only owners and managers can ${verb}.`)
  }
}

/** Throwable variant of denyIfNotOwner. Use in void-returning actions. */
export function assertOwner(role: StoreRole, verb = 'do this'): void {
  if (role !== 'owner') {
    throw new RoleDeniedError(`Only the owner can ${verb}.`)
  }
}

/**
 * Marker class so callers can distinguish role-denials from other
 * failures (e.g. show a specific toast, avoid Sentry noise on
 * expected denials).
 */
export class RoleDeniedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoleDeniedError'
  }
}
