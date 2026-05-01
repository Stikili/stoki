import { describe, expect, it } from 'vitest'
import { computeVat } from './vat'

describe('computeVat', () => {
  describe('non-VAT-registered store', () => {
    it('returns no VAT regardless of inclusive flag', () => {
      const result = computeVat(100, 1, false, true, 15)
      expect(result).toEqual({ inclusive: 100, exclusive: 100, vat: 0 })
    })

    it('honours qty', () => {
      const result = computeVat(50, 3, false, true, 15)
      expect(result).toEqual({ inclusive: 150, exclusive: 150, vat: 0 })
    })

    it('returns zero VAT even at non-zero rate', () => {
      const result = computeVat(100, 1, false, false, 15)
      expect(result.vat).toBe(0)
    })
  })

  describe('VAT-registered, inclusive pricing (SA retail standard)', () => {
    it('extracts 15/115 of an inclusive price', () => {
      // R23 incl. → R20 ex + R3 VAT
      const result = computeVat(23, 1, true, true, 15)
      expect(result.inclusive).toBe(23)
      expect(result.exclusive).toBe(20)
      expect(result.vat).toBe(3)
    })

    it('rounds to 2 decimal places', () => {
      // R100 incl @ 15% → R86.96 ex + R13.04 VAT
      const result = computeVat(100, 1, true, true, 15)
      expect(result.exclusive).toBe(86.96)
      expect(result.vat).toBe(13.04)
      expect(result.exclusive + result.vat).toBeCloseTo(100, 2)
    })

    it('multiplies VAT by quantity', () => {
      // 5 × R23 = R115 → R100 ex + R15 VAT
      const result = computeVat(23, 5, true, true, 15)
      expect(result.inclusive).toBe(115)
      expect(result.exclusive).toBe(100)
      expect(result.vat).toBe(15)
    })

    it('handles a different VAT rate (e.g. 20%)', () => {
      // R120 incl @ 20% → R100 ex + R20 VAT
      const result = computeVat(120, 1, true, true, 20)
      expect(result.exclusive).toBe(100)
      expect(result.vat).toBe(20)
    })
  })

  describe('VAT-registered, exclusive pricing', () => {
    it('adds VAT on top of an exclusive price', () => {
      // R100 ex → R115 incl
      const result = computeVat(100, 1, true, false, 15)
      expect(result.inclusive).toBe(115)
      expect(result.exclusive).toBe(100)
      expect(result.vat).toBe(15)
    })

    it('multiplies by qty', () => {
      const result = computeVat(50, 4, true, false, 15)
      expect(result.exclusive).toBe(200)
      expect(result.vat).toBe(30)
      expect(result.inclusive).toBe(230)
    })
  })

  describe('edge cases', () => {
    it('handles zero rate', () => {
      const result = computeVat(100, 1, true, true, 0)
      expect(result).toEqual({ inclusive: 100, exclusive: 100, vat: 0 })
    })

    it('handles zero qty', () => {
      const result = computeVat(100, 0, true, true, 15)
      expect(result).toEqual({ inclusive: 0, exclusive: 0, vat: 0 })
    })

    it('handles fractional unit price', () => {
      // R3.99 × 5 = R19.95 incl @ 15% → R17.35 ex + R2.60 VAT
      const result = computeVat(3.99, 5, true, true, 15)
      expect(result.inclusive).toBe(19.95)
      expect(result.exclusive).toBeCloseTo(17.35, 2)
      expect(result.vat).toBeCloseTo(2.60, 2)
    })
  })
})
