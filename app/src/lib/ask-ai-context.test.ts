import { describe, expect, it } from 'vitest'
import {
  askAiAboutExpense,
  askAiAboutRestock,
  askAiAboutSale,
  askAiUrl,
} from './ask-ai-context'

describe('askAiAboutSale', () => {
  it('embeds product, qty, per-unit and total prices with two decimals', () => {
    const prompt = askAiAboutSale({
      productName: 'Bread',
      qty: 3,
      pricePerUnit: 12.5,
      totalAmount: 37.5,
      recordedAt: '2026-01-15T10:00:00Z',
    })
    expect(prompt).toContain('Bread')
    expect(prompt).toContain('3×')
    expect(prompt).toContain('R12.50')
    expect(prompt).toContain('R37.50')
  })

  it('notes cash sales vs credit sales explicitly', () => {
    const cash = askAiAboutSale({
      productName: 'Milk', qty: 1, pricePerUnit: 20, totalAmount: 20, recordedAt: '2026-01-15T10:00:00Z',
    })
    const credit = askAiAboutSale({
      productName: 'Milk', qty: 1, pricePerUnit: 20, totalAmount: 20, recordedAt: '2026-01-15T10:00:00Z',
      wasCredit: true, customerName: 'Thabo',
    })
    expect(cash).toContain('Paid at the till')
    expect(credit).toContain('Sold on credit')
    expect(credit).toContain('Thabo')
  })
})

describe('askAiAboutExpense', () => {
  it('embeds category, description, amount and capital/operating flag', () => {
    const capital = askAiAboutExpense({
      category: 'stock', description: 'Fridge deposit', amount: 5000,
      recordedAt: '2026-01-15T10:00:00Z', isCapital: true,
    })
    expect(capital).toContain('Category: stock')
    expect(capital).toContain('Fridge deposit')
    expect(capital).toContain('R5000.00')
    expect(capital).toContain('capital')

    const operating = askAiAboutExpense({
      category: 'airtime', description: '', amount: 100,
      recordedAt: '2026-01-15T10:00:00Z',
    })
    expect(operating).toContain('operating expense')
    expect(operating).toContain('(none)')
  })
})

describe('askAiAboutRestock', () => {
  it('embeds product, qty, unit cost and supplier', () => {
    const prompt = askAiAboutRestock({
      productName: 'Coke 500ml', qty: 24, unitCost: 8.50, totalCost: 204,
      supplierName: 'Coca-Cola SA', recordedAt: '2026-01-15T10:00:00Z',
    })
    expect(prompt).toContain('Coke 500ml')
    expect(prompt).toContain('24 units')
    expect(prompt).toContain('R8.50')
    expect(prompt).toContain('R204.00')
    expect(prompt).toContain('Coca-Cola SA')
  })

  it('says supplier not recorded when supplier is missing', () => {
    const prompt = askAiAboutRestock({
      productName: 'X', qty: 1, unitCost: 1, totalCost: 1,
      recordedAt: '2026-01-15T10:00:00Z',
    })
    expect(prompt).toContain('Supplier: not recorded')
  })
})

describe('askAiUrl', () => {
  it('encodes the prompt and appends &send=1 so advisor auto-fires', () => {
    const url = askAiUrl('Explain this sale: 3 bread for R30')
    expect(url).toContain('/advisor?q=')
    expect(url).toContain('send=1')
    // Amp signs, colons, spaces must be percent-encoded so the URL is safe
    expect(url).toContain(encodeURIComponent('Explain this sale: 3 bread for R30'))
  })
})
