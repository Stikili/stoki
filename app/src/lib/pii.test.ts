import { describe, it, expect } from 'vitest'
import { hashPii, last4, maskedId } from './pii'

describe('hashPii', () => {
  // CRITICAL — this exact hex was computed by running migration 033's
  // backfill expression against the same input:
  //
  //   SELECT encode(
  //     digest('stoki-pii-salt-v1' || '8001015009087', 'sha256'),
  //     'hex'
  //   );
  //
  // If this test starts failing, the Node-side hash has drifted from
  // the PostgreSQL-side hash baked into the migration. EVERY existing
  // employee's stored hash is then wrong and ID-based lookups silently
  // fail. Do not "fix" the test by updating the expected value —
  // investigate why the two stopped agreeing.
  //
  // To re-verify against your own DB:
  //   1. Open Supabase SQL editor
  //   2. Run the SELECT above
  //   3. Confirm output matches the constant below
  const KNOWN_INPUT = '8001015009087'
  const SQL_BACKFILL_HASH = '09e1284e0d59510cfa34df3969d9416aaf506cead10b33869bf7103b791be09a'

  it('produces the same hash as the SQL backfill in migration 033', () => {
    expect(hashPii(KNOWN_INPUT)).toBe(SQL_BACKFILL_HASH)
  })

  it('is deterministic — same input always yields same hash', () => {
    expect(hashPii('1234567890123')).toBe(hashPii('1234567890123'))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashPii('1234567890123')).not.toBe(hashPii('1234567890124'))
  })

  it('produces a 64-char hex string (sha256 hex digest length)', () => {
    expect(hashPii('test')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('last4', () => {
  it('returns the last 4 characters', () => {
    expect(last4('1234567890123')).toBe('0123')
    expect(last4('1234')).toBe('1234')
  })

  it('trims whitespace before slicing', () => {
    expect(last4('  1234567890123  ')).toBe('0123')
  })

  it('returns null for inputs shorter than 4 chars', () => {
    expect(last4('123')).toBeNull()
    expect(last4('')).toBeNull()
  })
})

describe('maskedId', () => {
  it('formats as •••• <last4>', () => {
    expect(maskedId('5678')).toBe('•••• 5678')
  })

  it('returns em-dash for null', () => {
    expect(maskedId(null)).toBe('—')
  })
})
