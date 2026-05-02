import { describe, expect, it } from 'vitest'
import { parseBankStatementCsv, normaliseDate, parseAmount } from './csv-bank-statement'

describe('normaliseDate', () => {
  it('passes through ISO YYYY-MM-DD', () => {
    expect(normaliseDate('2026-04-15')).toBe('2026-04-15')
  })

  it('zero-pads single-digit ISO components', () => {
    expect(normaliseDate('2026-4-5')).toBe('2026-04-05')
  })

  it('parses SA DD/MM/YYYY', () => {
    expect(normaliseDate('15/04/2026')).toBe('2026-04-15')
    expect(normaliseDate('5/4/2026')).toBe('2026-04-05')
  })

  it('parses DD-MM-YYYY', () => {
    expect(normaliseDate('15-04-2026')).toBe('2026-04-15')
  })

  it('parses YYYY/MM/DD', () => {
    expect(normaliseDate('2026/04/15')).toBe('2026-04-15')
  })

  it('parses "DD Mon YYYY" (short month name)', () => {
    expect(normaliseDate('15 Apr 2026')).toBe('2026-04-15')
    expect(normaliseDate('1 jan 2026')).toBe('2026-01-01')
  })

  it('returns null on unparseable input', () => {
    expect(normaliseDate('garbage')).toBeNull()
    expect(normaliseDate('')).toBeNull()
  })
})

describe('parseAmount', () => {
  it('parses plain numbers', () => {
    expect(parseAmount('123.45')).toBe(123.45)
    expect(parseAmount('-50.00')).toBe(-50)
  })

  it('strips R/$ prefixes and whitespace', () => {
    expect(parseAmount('R 1234.56')).toBe(1234.56)
    expect(parseAmount(' 200.00 ')).toBe(200)
  })

  it('handles SA "1 234,56" (space thousands, comma decimal)', () => {
    expect(parseAmount('1 234,56')).toBe(1234.56)
  })

  it('handles US "1,234.56" (comma thousands, dot decimal)', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56)
  })

  it('treats lone comma with 2 trailing digits as decimal', () => {
    expect(parseAmount('1,23')).toBe(1.23)
  })

  it('treats lone comma with 3+ trailing digits as thousands', () => {
    expect(parseAmount('1,234')).toBe(1234)
    expect(parseAmount('12,345')).toBe(12345)
  })

  it('parses accountant-style (123.45) as negative', () => {
    expect(parseAmount('(123.45)')).toBe(-123.45)
  })

  it('returns null on garbage', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
  })
})

describe('parseBankStatementCsv', () => {
  it('parses an FNB-style signed-amount export', () => {
    const csv = `Date,Description,Amount,Balance
2026-04-15,POS PURCHASE - WOOLWORTHS,-150.00,4850.00
2026-04-16,EFT CREDIT - INVOICE 1042,2300.00,7150.00
2026-04-17,CASH DEPOSIT,500.00,7650.00`
    const result = parseBankStatementCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.detectedFormat).toBe('signed-amount')
    expect(result.lines).toHaveLength(3)
    expect(result.lines[0]).toMatchObject({
      date: '2026-04-15',
      description: 'POS PURCHASE - WOOLWORTHS',
      amount: -150,
    })
    expect(result.lines[1].amount).toBe(2300)
  })

  it('parses a Capitec-style "Money In / Money Out" export', () => {
    const csv = `Date Posted,Description,Money In,Money Out,Balance
15/04/2026,Card swipe Pick n Pay,,250.00,4750.00
16/04/2026,Salary deposit,8500.00,,13250.00`
    const result = parseBankStatementCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.detectedFormat).toBe('split-debit-credit')
    expect(result.lines).toHaveLength(2)
    expect(result.lines[0].amount).toBe(-250)
    expect(result.lines[1].amount).toBe(8500)
  })

  it('parses an ABSA-style debit/credit export', () => {
    const csv = `Trans Date,Description,Debit,Credit,Balance
2026-04-15,SUPPLIER PAYMENT,1200.00,,3800.00
2026-04-16,CUSTOMER EFT,,5000.00,8800.00`
    const result = parseBankStatementCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.lines[0].amount).toBe(-1200)
    expect(result.lines[1].amount).toBe(5000)
  })

  it('skips preamble rows before the header', () => {
    const csv = `Account: 12345678
Period: 01 Apr 2026 to 30 Apr 2026

Date,Description,Amount
2026-04-15,Test,100.00`
    const result = parseBankStatementCsv(csv)
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].amount).toBe(100)
  })

  it('skips zero-amount rows (closing-balance markers)', () => {
    const csv = `Date,Description,Amount
2026-04-15,Opening balance,0
2026-04-15,Sale,100`
    const result = parseBankStatementCsv(csv)
    expect(result.lines).toHaveLength(1)
  })

  it('records errors for unparseable dates without aborting', () => {
    const csv = `Date,Description,Amount
not-a-date,Bad row,100
2026-04-16,Good row,200`
    const result = parseBankStatementCsv(csv)
    expect(result.errors).toHaveLength(1)
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].amount).toBe(200)
  })

  it('returns an error when the header is missing entirely', () => {
    const csv = `2026-04-15,foo,100
2026-04-16,bar,200`
    const result = parseBankStatementCsv(csv)
    expect(result.lines).toEqual([])
    expect(result.errors[0].message).toMatch(/header/i)
  })

  it('returns an error on an empty file', () => {
    const result = parseBankStatementCsv('   ')
    expect(result.errors[0].message).toMatch(/empty/i)
  })

  it('captures a reference column when present', () => {
    const csv = `Date,Description,Reference,Amount
2026-04-15,EFT IN,INV-1042,2300.00`
    const result = parseBankStatementCsv(csv)
    expect(result.lines[0].reference).toBe('INV-1042')
  })

  it('handles quoted values with embedded commas in description', () => {
    const csv = `Date,Description,Amount
2026-04-15,"Pick n Pay, Sea Point",-300.00`
    const result = parseBankStatementCsv(csv)
    expect(result.lines[0].description).toBe('Pick n Pay, Sea Point')
    expect(result.lines[0].amount).toBe(-300)
  })
})
