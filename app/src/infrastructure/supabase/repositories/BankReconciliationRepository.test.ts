import { describe, expect, it } from 'vitest'
import { compositeKey } from './BankReconciliationRepository'

describe('compositeKey', () => {
  it('produces a deterministic pipe-delimited string', () => {
    expect(compositeKey('2026-04-15', 2300, 'eft invoice 1042')).toBe(
      '2026-04-15|2300|eft invoice 1042',
    )
  })

  it('distinguishes different dates', () => {
    const a = compositeKey('2026-04-15', 100, 'payment')
    const b = compositeKey('2026-04-16', 100, 'payment')
    expect(a).not.toBe(b)
  })

  it('distinguishes different amounts', () => {
    const a = compositeKey('2026-04-15', 100, 'payment')
    const b = compositeKey('2026-04-15', 200, 'payment')
    expect(a).not.toBe(b)
  })

  it('distinguishes different description fingerprints', () => {
    const a = compositeKey('2026-04-15', 100, 'woolworths')
    const b = compositeKey('2026-04-15', 100, 'checkers')
    expect(a).not.toBe(b)
  })

  it('handles negative amounts', () => {
    const key = compositeKey('2026-04-15', -150, 'pos purchase')
    expect(key).toBe('2026-04-15|-150|pos purchase')
  })
})
