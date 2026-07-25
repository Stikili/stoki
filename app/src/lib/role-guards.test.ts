import { describe, expect, it } from 'vitest'
import {
  assertNotCashier,
  assertOwner,
  denyIfCashier,
  denyIfNotOwner,
  RoleDeniedError,
} from './role-guards'

describe('denyIfCashier', () => {
  it('returns null for owner', () => {
    expect(denyIfCashier('owner')).toBeNull()
  })

  it('returns null for manager', () => {
    expect(denyIfCashier('manager')).toBeNull()
  })

  it('returns a RoleDenied object for cashier', () => {
    const r = denyIfCashier('cashier')
    expect(r?.ok).toBe(false)
    expect(r?.error).toMatch(/only owners and managers/i)
  })

  it('interpolates the verb into the denial message', () => {
    const r = denyIfCashier('cashier', 'create a supplier')
    expect(r?.error).toBe('Only owners and managers can create a supplier.')
  })
})

describe('denyIfNotOwner', () => {
  it('returns null for owner', () => {
    expect(denyIfNotOwner('owner')).toBeNull()
  })

  it('returns a RoleDenied object for manager', () => {
    const r = denyIfNotOwner('manager')
    expect(r?.ok).toBe(false)
    expect(r?.error).toMatch(/only the owner/i)
  })

  it('returns a RoleDenied object for cashier', () => {
    const r = denyIfNotOwner('cashier')
    expect(r?.ok).toBe(false)
  })

  it('interpolates the verb', () => {
    const r = denyIfNotOwner('manager', 'delete a business')
    expect(r?.error).toBe('Only the owner can delete a business.')
  })
})

describe('assertNotCashier', () => {
  it('does not throw for owner or manager', () => {
    expect(() => assertNotCashier('owner')).not.toThrow()
    expect(() => assertNotCashier('manager')).not.toThrow()
  })

  it('throws RoleDeniedError for cashier', () => {
    expect(() => assertNotCashier('cashier', 'edit prices')).toThrowError(RoleDeniedError)
    try {
      assertNotCashier('cashier', 'edit prices')
    } catch (e) {
      expect(e).toBeInstanceOf(RoleDeniedError)
      expect((e as Error).message).toBe('Only owners and managers can edit prices.')
    }
  })
})

describe('assertOwner', () => {
  it('does not throw for owner', () => {
    expect(() => assertOwner('owner')).not.toThrow()
  })

  it('throws for manager', () => {
    expect(() => assertOwner('manager', 'delete a store')).toThrowError(RoleDeniedError)
  })

  it('throws for cashier', () => {
    expect(() => assertOwner('cashier')).toThrowError(RoleDeniedError)
  })
})

describe('RoleDeniedError', () => {
  it('is an Error with a stable name', () => {
    const e = new RoleDeniedError('test')
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe('RoleDeniedError')
    expect(e.message).toBe('test')
  })
})
