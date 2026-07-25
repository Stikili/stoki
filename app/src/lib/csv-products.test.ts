import { describe, expect, it } from 'vitest'
import { parseProductCsv } from './csv-products'

describe('parseProductCsv', () => {
  it('parses a minimal valid CSV (only required columns)', () => {
    const csv = 'name,price\nBread,16.99\nMilk,23.99'
    const result = parseProductCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      { name: 'Bread', price: 16.99, cost: 0, qty: 0, reorderPoint: 5, sku: null, unitLabel: null },
      { name: 'Milk',  price: 23.99, cost: 0, qty: 0, reorderPoint: 5, sku: null, unitLabel: null },
    ])
  })

  it('parses the full schema in canonical order', () => {
    const csv = 'name,price,cost,qty,reorder_point,sku\nBread,16.99,12,20,10,BREAD-1'
    const result = parseProductCsv(csv)
    expect(result.rows).toEqual([
      { name: 'Bread', price: 16.99, cost: 12, qty: 20, reorderPoint: 10, sku: 'BREAD-1', unitLabel: null },
    ])
  })

  it('handles columns in any order', () => {
    const csv = 'sku,price,name,qty\nB-1,10,Bread,5'
    const result = parseProductCsv(csv)
    expect(result.rows[0]).toMatchObject({ name: 'Bread', price: 10, qty: 5, sku: 'B-1' })
  })

  it('header matching is case-insensitive and tolerates whitespace', () => {
    const csv = '  Name , Price\nBread, 10'
    const result = parseProductCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.rows[0]).toMatchObject({ name: 'Bread', price: 10 })
  })

  it('handles "Reorder Point" with a space (normalised to reorder_point)', () => {
    const csv = 'name,price,Reorder Point\nBread,10,8'
    const result = parseProductCsv(csv)
    expect(result.rows[0].reorderPoint).toBe(8)
  })

  it('handles quoted values with embedded commas', () => {
    const csv = 'name,price\n"Coke (2L), Original",29.99'
    const result = parseProductCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].name).toBe('Coke (2L), Original')
  })

  it('handles doubled quotes inside quoted values', () => {
    const csv = 'name,price\n"Brand ""X"" Bread",16.99'
    const result = parseProductCsv(csv)
    expect(result.rows[0].name).toBe('Brand "X" Bread')
  })

  it('handles CRLF line endings (Windows Excel exports)', () => {
    const csv = 'name,price\r\nBread,10\r\nMilk,20'
    const result = parseProductCsv(csv)
    expect(result.rows).toHaveLength(2)
  })

  it('skips blank lines', () => {
    const csv = 'name,price\nBread,10\n\n\nMilk,20\n'
    const result = parseProductCsv(csv)
    expect(result.rows).toHaveLength(2)
  })

  it('strips currency symbols from price/cost', () => {
    const csv = 'name,price,cost\nBread,R 16.99,R12'
    const result = parseProductCsv(csv)
    expect(result.rows[0]).toMatchObject({ price: 16.99, cost: 12 })
  })

  it('treats empty sku as null', () => {
    const csv = 'name,price,sku\nBread,10,'
    const result = parseProductCsv(csv)
    expect(result.rows[0].sku).toBeNull()
  })

  describe('errors', () => {
    it('reports missing required header', () => {
      const csv = 'name\nBread'
      const result = parseProductCsv(csv)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toMatch(/Missing required column "price"/)
      expect(result.rows).toEqual([])
    })

    it('reports empty file', () => {
      const result = parseProductCsv('')
      expect(result.errors[0].message).toMatch(/empty/i)
    })

    it('reports a row with missing name but keeps other rows', () => {
      const csv = 'name,price\nBread,10\n,20\nMilk,30'
      const result = parseProductCsv(csv)
      expect(result.rows).toHaveLength(2)
      expect(result.rows.map(r => r.name)).toEqual(['Bread', 'Milk'])
      expect(result.errors).toEqual([
        { line: 3, message: 'Missing product name' },
      ])
    })

    it('reports invalid price but keeps other rows', () => {
      const csv = 'name,price\nBread,10\nMilk,abc'
      const result = parseProductCsv(csv)
      expect(result.rows).toHaveLength(1)
      expect(result.errors).toEqual([
        { line: 3, message: 'Invalid price "abc"' },
      ])
    })

    it('reports negative cost', () => {
      const csv = 'name,price,cost\nBread,10,-5'
      const result = parseProductCsv(csv)
      expect(result.errors).toContainEqual({ line: 2, message: 'Cost cannot be negative' })
    })

    it('reports negative qty', () => {
      const csv = 'name,price,qty\nBread,10,-5'
      const result = parseProductCsv(csv)
      expect(result.errors).toContainEqual({ line: 2, message: 'Qty cannot be negative' })
    })

    it('line numbers refer to the original 1-indexed CSV line', () => {
      const csv = 'name,price\n\nBread,abc' // bad row is line 3
      const result = parseProductCsv(csv)
      expect(result.errors[0].line).toBe(3)
    })
  })

  describe('weighables', () => {
    it('accepts decimal qty for weighable products (numeric(10,3) post-migration-015)', () => {
      const csv = 'name,price,qty,unit_label\nRice,25.00,50.500,kg'
      const result = parseProductCsv(csv)
      expect(result.errors).toEqual([])
      expect(result.rows[0]).toMatchObject({
        name: 'Rice', price: 25, qty: 50.5, unitLabel: 'kg',
      })
    })

    it('accepts every valid unit label', () => {
      const csv = 'name,price,unit_label\nA,1,each\nB,1,kg\nC,1,g\nD,1,l\nE,1,ml'
      const result = parseProductCsv(csv)
      expect(result.rows.map(r => r.unitLabel)).toEqual(['each', 'kg', 'g', 'l', 'ml'])
    })

    it('drops unknown unit labels silently (typo tolerance)', () => {
      const csv = 'name,price,unit_label\nA,1,kilos'
      const result = parseProductCsv(csv)
      expect(result.rows[0].unitLabel).toBeNull()
    })

    it('is case-insensitive on unit labels', () => {
      const csv = 'name,price,unit_label\nA,1,KG\nB,1,Ml'
      const result = parseProductCsv(csv)
      expect(result.rows.map(r => r.unitLabel)).toEqual(['kg', 'ml'])
    })

    it('leaves unitLabel null when the column is missing (backwards compat)', () => {
      const csv = 'name,price\nA,1'
      const result = parseProductCsv(csv)
      expect(result.rows[0].unitLabel).toBeNull()
    })

    it('accepts decimal reorder_point for weighables', () => {
      const csv = 'name,price,reorder_point,unit_label\nRice,25,2.500,kg'
      const result = parseProductCsv(csv)
      expect(result.rows[0].reorderPoint).toBe(2.5)
    })
  })
})
