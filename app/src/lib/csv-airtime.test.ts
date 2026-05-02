import { describe, expect, it } from 'vitest'
import { parseAirtimePinCsv, normaliseExpiry } from './csv-airtime'

describe('normaliseExpiry', () => {
  it('passes through ISO YYYY-MM-DD', () => {
    expect(normaliseExpiry('2026-12-31')).toBe('2026-12-31')
  })

  it('zero-pads ISO components', () => {
    expect(normaliseExpiry('2026-1-5')).toBe('2026-01-05')
  })

  it('parses SA DD/MM/YYYY', () => {
    expect(normaliseExpiry('31/12/2026')).toBe('2026-12-31')
    expect(normaliseExpiry('5/1/2026')).toBe('2026-01-05')
  })

  it('returns null on garbage', () => {
    expect(normaliseExpiry('garbage')).toBeNull()
    expect(normaliseExpiry('')).toBeNull()
  })
})

describe('parseAirtimePinCsv', () => {
  it('parses a minimal pin-only CSV', () => {
    const csv = `pin
1234567890
9876543210`
    const result = parseAirtimePinCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      { pin: '1234567890', serial: null, expiresAt: null },
      { pin: '9876543210', serial: null, expiresAt: null },
    ])
  })

  it('parses pin + serial + expires_at', () => {
    const csv = `pin,serial,expires_at
1234,SER001,2026-12-31
5678,SER002,2027-06-30`
    const result = parseAirtimePinCsv(csv)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({ pin: '1234', serial: 'SER001', expiresAt: '2026-12-31' })
  })

  it('honours a different column order', () => {
    const csv = `serial,pin
SER1,AAAA
SER2,BBBB`
    const result = parseAirtimePinCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.rows[0].pin).toBe('AAAA')
    expect(result.rows[0].serial).toBe('SER1')
  })

  it('skips blank lines', () => {
    const csv = `pin
1111

2222`
    expect(parseAirtimePinCsv(csv).rows).toHaveLength(2)
  })

  it('records an error when the pin column is missing', () => {
    const csv = `serial,expires_at
SER1,2026-12-31`
    const result = parseAirtimePinCsv(csv)
    expect(result.rows).toEqual([])
    expect(result.errors[0].message).toMatch(/pin/i)
  })

  it('flags duplicate pins inside the same upload', () => {
    const csv = `pin
1234
5678
1234`
    const result = parseAirtimePinCsv(csv)
    expect(result.rows).toHaveLength(2) // first dupe kept, second rejected
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toMatch(/duplicate/i)
  })

  it('flags malformed expiry without dropping good rows', () => {
    const csv = `pin,expires_at
1234,2026-12-31
5678,garbage
9999,2027-01-01`
    const result = parseAirtimePinCsv(csv)
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toMatch(/expiry/i)
  })

  it('errors on an empty file', () => {
    expect(parseAirtimePinCsv('   ').errors[0].message).toMatch(/empty/i)
  })

  it('skips rows missing the pin field', () => {
    const csv = `pin,serial
,SER-orphan
1234,SER1`
    const result = parseAirtimePinCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.errors[0].message).toMatch(/missing pin/i)
  })
})
