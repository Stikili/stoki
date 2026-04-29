export interface ParsedCommand {
  command: 'sell' | 'stock' | 'credit' | 'today' | 'help' | 'unknown'
  product?: string
  qty?: number
}

export function parseCommand(text: string): ParsedCommand {
  const t = text.trim().toLowerCase()

  // Help
  if (t === 'help' || t === '?' || t === 'hi' || t === 'hello') {
    return { command: 'help' }
  }

  // Today / summary
  if (t === 'today' || t === 'summary' || t === 'sales' || t === 'revenue') {
    return { command: 'today' }
  }

  // Stock / inventory
  if (t === 'stock' || t === 'inventory' || t === 'low stock') {
    return { command: 'stock' }
  }

  // Credit / debtors
  if (t === 'credit' || t === 'debts' || t === 'who owes me' || t === 'debtors' || t === 'owed') {
    return { command: 'credit' }
  }

  // Sell — "sell bread 3", "sold coke 2", "sell 5 bread"
  const sellMatch = t.match(/^(?:sell|sold|record)\s+(.+)$/i)
  if (sellMatch) {
    const rest = sellMatch[1].trim()
    // "bread 3" or "3 bread"
    const numFirst = rest.match(/^(\d+)\s+(.+)$/)
    const numLast = rest.match(/^(.+?)\s+(\d+)$/)

    if (numFirst) {
      return { command: 'sell', product: numFirst[2].trim(), qty: parseInt(numFirst[1]) }
    }
    if (numLast) {
      return { command: 'sell', product: numLast[1].trim(), qty: parseInt(numLast[2]) }
    }
    // No qty specified — default to 1
    return { command: 'sell', product: rest, qty: 1 }
  }

  return { command: 'unknown' }
}

export function fuzzyMatch(query: string, names: { id: string; name: string }[]): { id: string; name: string } | null {
  const q = query.toLowerCase()
  // Exact match first
  const exact = names.find(n => n.name.toLowerCase() === q)
  if (exact) return exact
  // Contains match
  const contains = names.find(n => n.name.toLowerCase().includes(q))
  if (contains) return contains
  // Reverse contains (query contains product name)
  const reverse = names.find(n => q.includes(n.name.toLowerCase()))
  if (reverse) return reverse
  return null
}
