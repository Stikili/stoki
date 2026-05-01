import { describe, expect, it } from 'vitest'
import { parseCommand, fuzzyMatch } from './whatsapp-parser'

describe('parseCommand', () => {
  describe('greetings → help', () => {
    it.each(['help', 'HELP', '?', 'hi', 'hello', '  hi  '])(
      'parses %j as help',
      (input) => {
        expect(parseCommand(input)).toEqual({ command: 'help' })
      },
    )
  })

  describe('summary commands', () => {
    it.each(['today', 'summary', 'sales', 'revenue'])(
      'parses %j as today',
      (input) => {
        expect(parseCommand(input)).toEqual({ command: 'today' })
      },
    )
  })

  describe('stock commands', () => {
    it.each(['stock', 'inventory', 'low stock'])(
      'parses %j as stock',
      (input) => {
        expect(parseCommand(input)).toEqual({ command: 'stock' })
      },
    )
  })

  describe('credit commands', () => {
    it.each(['credit', 'debts', 'who owes me', 'debtors', 'owed'])(
      'parses %j as credit',
      (input) => {
        expect(parseCommand(input)).toEqual({ command: 'credit' })
      },
    )
  })

  describe('sell commands', () => {
    it('parses "sell bread 3" with product first, qty last', () => {
      expect(parseCommand('sell bread 3')).toEqual({
        command: 'sell',
        product: 'bread',
        qty: 3,
      })
    })

    it('parses "sell 3 bread" with qty first', () => {
      expect(parseCommand('sell 3 bread')).toEqual({
        command: 'sell',
        product: 'bread',
        qty: 3,
      })
    })

    it('handles multi-word product names', () => {
      expect(parseCommand('sell white bread 5')).toEqual({
        command: 'sell',
        product: 'white bread',
        qty: 5,
      })
    })

    it('defaults qty to 1 when not specified', () => {
      expect(parseCommand('sell bread')).toEqual({
        command: 'sell',
        product: 'bread',
        qty: 1,
      })
    })

    it.each(['sell', 'sold', 'record'])('accepts %j as the verb', (verb) => {
      const result = parseCommand(`${verb} bread 2`)
      expect(result.command).toBe('sell')
      expect(result.product).toBe('bread')
      expect(result.qty).toBe(2)
    })

    it('is case-insensitive', () => {
      expect(parseCommand('SELL Bread 4')).toEqual({
        command: 'sell',
        product: 'bread',
        qty: 4,
      })
    })
  })

  describe('unknown', () => {
    it('returns unknown for unrecognised input', () => {
      expect(parseCommand('how is business?')).toEqual({ command: 'unknown' })
      expect(parseCommand('xyz')).toEqual({ command: 'unknown' })
    })

    it('returns unknown for empty string', () => {
      expect(parseCommand('')).toEqual({ command: 'unknown' })
    })
  })
})

describe('fuzzyMatch', () => {
  const products = [
    { id: 'p1', name: 'White Bread (700g)' },
    { id: 'p2', name: 'Coke 340ml Can' },
    { id: 'p3', name: 'Maggi Noodles' },
  ]

  it('matches exact (case-insensitive)', () => {
    expect(fuzzyMatch('White Bread (700g)', products)).toEqual({
      id: 'p1',
      name: 'White Bread (700g)',
    })
    expect(fuzzyMatch('white bread (700g)', products)).toEqual({
      id: 'p1',
      name: 'White Bread (700g)',
    })
  })

  it('matches a product name that contains the query', () => {
    expect(fuzzyMatch('coke', products)?.id).toBe('p2')
    expect(fuzzyMatch('bread', products)?.id).toBe('p1')
    expect(fuzzyMatch('noodles', products)?.id).toBe('p3')
  })

  it('matches when the query contains the product name (reverse contains)', () => {
    // "i want some maggi noodles for dinner" — the product name is inside the query
    expect(fuzzyMatch('i want some maggi noodles for dinner', products)?.id).toBe('p3')
  })

  it('returns null when nothing matches', () => {
    expect(fuzzyMatch('milk', products)).toBeNull()
  })

  it('returns null for empty product list', () => {
    expect(fuzzyMatch('bread', [])).toBeNull()
  })
})
