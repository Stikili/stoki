import { describe, expect, it } from 'vitest'
import {
  encodeReceipt,
  encodeTestPrint,
  wrap,
  padLine,
  CMD_INIT,
  CMD_ALIGN_CENTER,
  CMD_BOLD_ON,
  CMD_BOLD_OFF,
  CMD_CUT_PARTIAL,
  CMD_FEED_3_LINES,
} from './escpos'

function asArray(bytes: Uint8Array): number[] {
  return Array.from(bytes)
}

function containsSubsequence(haystack: number[], needle: readonly number[]): boolean {
  if (needle.length === 0) return true
  outer:
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

function decodeAscii(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) {
    if (b >= 0x20 && b < 0x7f) s += String.fromCharCode(b)
    else if (b === 0x0a) s += '\n'
    // skip control codes for readability
  }
  return s
}

describe('wrap', () => {
  it('returns the original line when it fits', () => {
    expect(wrap('hello', 10)).toEqual(['hello'])
  })

  it('splits on whitespace at the boundary', () => {
    expect(wrap('hello world friends', 11)).toEqual(['hello world', 'friends'])
  })

  it('hard-breaks single words longer than width', () => {
    expect(wrap('supercalifragilistic', 5)).toEqual(['super', 'calif', 'ragil', 'istic'])
  })

  it('handles empty input', () => {
    expect(wrap('', 5)).toEqual([''])
  })
})

describe('padLine', () => {
  it('pads spaces between left and right to reach width', () => {
    const r = padLine('A', 'B', 5)
    expect(r).toBe('A   B')
    expect(r.length).toBe(5)
  })

  it('truncates the left side when the line would overflow', () => {
    const r = padLine('a long description', 'R10.00', 10)
    expect(r.length).toBeLessThanOrEqual(10)
    expect(r.endsWith('R10.00')).toBe(true)
  })
})

describe('encodeReceipt', () => {
  const baseReceipt = {
    storeName: 'Test Shop',
    headerLabel: 'RECEIPT',
    invoiceNumber: null,
    vatNumber: null,
    businessAddress: null,
    businessPhone: null,
    date: '2026-04-15',
    items: [
      { name: 'Bread', qty: 2, total: 30 },
      { name: 'Milk', qty: 1, total: 25 },
    ],
    subtotalExcl: null,
    vatAmount: null,
    vatRate: null,
    total: 55,
  }

  it('starts with the init command', () => {
    const bytes = asArray(encodeReceipt(baseReceipt))
    expect(bytes.slice(0, CMD_INIT.length)).toEqual(CMD_INIT)
  })

  it('ends with feed + partial cut so the next receipt is clear of the print head', () => {
    const bytes = asArray(encodeReceipt(baseReceipt))
    const tailLen = CMD_FEED_3_LINES.length + CMD_CUT_PARTIAL.length
    const tail = bytes.slice(-tailLen)
    expect(tail).toEqual([...CMD_FEED_3_LINES, ...CMD_CUT_PARTIAL])
  })

  it('includes alignment + bold for the header', () => {
    const bytes = asArray(encodeReceipt(baseReceipt))
    expect(containsSubsequence(bytes, CMD_ALIGN_CENTER)).toBe(true)
    expect(containsSubsequence(bytes, CMD_BOLD_ON)).toBe(true)
    expect(containsSubsequence(bytes, CMD_BOLD_OFF)).toBe(true)
  })

  it('renders store name, items, and total in the printable text', () => {
    const text = decodeAscii(encodeReceipt(baseReceipt))
    expect(text).toContain('Test Shop')
    expect(text).toContain('2x Bread')
    expect(text).toContain('R30.00')
    expect(text).toContain('TOTAL')
    expect(text).toContain('R55.00')
  })

  it('renders the VAT block only when subtotal/vat are provided', () => {
    const noVat = decodeAscii(encodeReceipt(baseReceipt))
    expect(noVat).not.toContain('VAT @')

    const withVat = decodeAscii(encodeReceipt({
      ...baseReceipt,
      subtotalExcl: 47.83,
      vatAmount: 7.17,
      vatRate: 15,
    }))
    expect(withVat).toContain('Subtotal (excl. VAT)')
    expect(withVat).toContain('VAT @ 15%')
  })

  it('replaces non-ASCII characters with "?" for CP437 safety', () => {
    const text = decodeAscii(encodeReceipt({
      ...baseReceipt,
      storeName: 'Café Olé', // é is non-ASCII
    }))
    expect(text).toContain('Caf?')
  })

  it('wraps long item names without dropping the price', () => {
    const text = decodeAscii(encodeReceipt({
      ...baseReceipt,
      items: [
        { name: 'A really long product name that does not fit on one line', qty: 1, total: 99 },
      ],
    }))
    expect(text).toContain('R99.00')
    expect(text).toContain('A really long product')
  })

  it('emits invoice number when provided', () => {
    const text = decodeAscii(encodeReceipt({
      ...baseReceipt,
      invoiceNumber: 'INV-00042',
    }))
    expect(text).toContain('INV-00042')
  })
})

describe('encodeTestPrint', () => {
  it('returns a non-empty Uint8Array', () => {
    const bytes = encodeTestPrint('Test Store', '2026-05-16')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('starts with ESC @ init and ends with feed + partial cut', () => {
    const arr = asArray(encodeTestPrint('My Shop', '2026-05-16'))
    expect(containsSubsequence(arr, CMD_INIT)).toBe(true)
    expect(containsSubsequence(arr, CMD_FEED_3_LINES)).toBe(true)
    expect(containsSubsequence(arr, CMD_CUT_PARTIAL)).toBe(true)
  })

  it('includes the word STOKI', () => {
    const text = decodeAscii(encodeTestPrint('My Shop', '2026-05-16'))
    expect(text).toContain('STOKI')
  })

  it('includes the store name (truncated to fit)', () => {
    const text = decodeAscii(encodeTestPrint('Corner Cafe', '2026-05-16'))
    expect(text).toContain('Corner Cafe')
  })

  it('truncates very long store names rather than overflowing', () => {
    const longName = 'A'.repeat(50)
    const text = decodeAscii(encodeTestPrint(longName, '2026-05-16'))
    expect(text.length).toBeGreaterThan(0)
    // Should not throw and should still contain the OK status
    expect(text).toContain('OK')
  })

  it('includes the date label', () => {
    const text = decodeAscii(encodeTestPrint('Shop', '2026-05-16 09:30'))
    expect(text).toContain('2026-05-16 09:30')
  })

  it('includes the working confirmation message', () => {
    const text = decodeAscii(encodeTestPrint('Shop', '2026-05-16'))
    expect(text).toContain('Printer is working!')
  })
})
