// Pure ESC/POS command encoder for thermal receipt printers.
// No I/O — the writer just appends bytes; the caller hands the finished
// Uint8Array to the Web Bluetooth GATT characteristic.
// Tested in escpos.test.ts.

export interface ReceiptLine {
  name: string
  qty: number
  total: number
}

export interface ReceiptData {
  storeName: string
  /** "TAX INVOICE" when VAT-registered, "RECEIPT" otherwise. */
  headerLabel: string
  invoiceNumber: string | null
  vatNumber: string | null
  businessAddress: string | null
  businessPhone: string | null
  date: string
  items: ReceiptLine[]
  /** Pre-computed totals — caller does the VAT math, encoder just renders. */
  subtotalExcl: number | null
  vatAmount: number | null
  vatRate: number | null
  total: number
  /** Default 32 — width of common 58 mm receipt paper. Use 48 for 80 mm. */
  width?: number
}

// ESC/POS command bytes — kept as named constants so the test suite can
// assert against them without hard-coding magic numbers.
export const ESC = 0x1b
export const GS = 0x1d

export const CMD_INIT          = [ESC, 0x40] // ESC @
export const CMD_ALIGN_LEFT    = [ESC, 0x61, 0x00]
export const CMD_ALIGN_CENTER  = [ESC, 0x61, 0x01]
export const CMD_ALIGN_RIGHT   = [ESC, 0x61, 0x02]
export const CMD_BOLD_ON       = [ESC, 0x45, 0x01]
export const CMD_BOLD_OFF      = [ESC, 0x45, 0x00]
export const CMD_DOUBLE_HEIGHT = [GS, 0x21, 0x01]
export const CMD_NORMAL_SIZE   = [GS, 0x21, 0x00]
export const CMD_FEED_3_LINES  = [ESC, 0x64, 0x03]
export const CMD_CUT_PARTIAL   = [GS, 0x56, 0x01]

class EscposBuffer {
  private bytes: number[] = []

  push(...values: number[]): this { this.bytes.push(...values); return this }
  pushAll(arr: readonly number[]): this { for (const v of arr) this.bytes.push(v); return this }

  /** Append CP437-safe ASCII text. Non-ASCII chars are replaced with '?'. */
  text(s: string): this {
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i)
      // Most thermal printers default to CP437/CP850. Strip out anything
      // outside printable ASCII — avoids garbled output if the buyer's printer
      // uses a different code page (which we can't detect without pairing logic).
      this.bytes.push(code >= 0x20 && code < 0x7f ? code : 0x3f) // '?'
    }
    return this
  }

  newline(): this { this.bytes.push(0x0a); return this }

  toBytes(): Uint8Array { return new Uint8Array(this.bytes) }
}

/**
 * Wrap a single line so it doesn't exceed `width` characters.
 * Splits on whitespace where possible; falls back to a hard cut for very long words.
 */
export function wrap(text: string, width: number): string[] {
  if (text.length <= width) return [text]
  const out: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (word.length > width) {
      // Break the long word into width-sized chunks.
      if (line) { out.push(line); line = '' }
      for (let i = 0; i < word.length; i += width) out.push(word.slice(i, i + width))
      continue
    }
    if (line.length === 0) line = word
    else if (line.length + 1 + word.length <= width) line += ' ' + word
    else { out.push(line); line = word }
  }
  if (line) out.push(line)
  return out
}

/** "12  Item name        R45.00" — left/right aligned within `width`. */
export function padLine(left: string, right: string, width: number): string {
  const space = width - left.length - right.length
  if (space < 1) {
    // Truncate left side to fit (right side is the price — protect it).
    const maxLeft = Math.max(0, width - right.length - 1)
    return left.slice(0, maxLeft) + ' ' + right
  }
  return left + ' '.repeat(space) + right
}

export function encodeReceipt(data: ReceiptData): Uint8Array {
  const width = data.width ?? 32
  const buf = new EscposBuffer()

  buf.pushAll(CMD_INIT)
  buf.pushAll(CMD_ALIGN_CENTER)
  buf.pushAll(CMD_BOLD_ON).pushAll(CMD_DOUBLE_HEIGHT)
  buf.text(data.storeName).newline()
  buf.pushAll(CMD_NORMAL_SIZE).pushAll(CMD_BOLD_OFF)

  if (data.businessAddress) {
    for (const line of wrap(data.businessAddress, width)) {
      buf.text(line).newline()
    }
  }
  if (data.businessPhone) buf.text(`Tel: ${data.businessPhone}`).newline()
  if (data.vatNumber) buf.text(`VAT: ${data.vatNumber}`).newline()
  buf.newline()

  buf.pushAll(CMD_BOLD_ON).text(data.headerLabel).newline().pushAll(CMD_BOLD_OFF)
  if (data.invoiceNumber) buf.text(data.invoiceNumber).newline()
  buf.text(data.date).newline()

  buf.pushAll(CMD_ALIGN_LEFT)
  buf.text('-'.repeat(width)).newline()

  for (const item of data.items) {
    const lineTotal = `R${item.total.toFixed(2)}`
    const namePart = `${item.qty}x ${item.name}`
    // If the item description doesn't fit on one line, wrap the name and put
    // the price on the last wrapped line (right-aligned).
    const wrapped = wrap(namePart, width - lineTotal.length - 1)
    for (let i = 0; i < wrapped.length; i++) {
      if (i === wrapped.length - 1) {
        buf.text(padLine(wrapped[i], lineTotal, width)).newline()
      } else {
        buf.text(wrapped[i]).newline()
      }
    }
  }

  buf.text('-'.repeat(width)).newline()

  if (data.subtotalExcl !== null && data.vatAmount !== null && data.vatRate !== null) {
    buf.text(padLine('Subtotal (excl. VAT)', `R${data.subtotalExcl.toFixed(2)}`, width)).newline()
    buf.text(padLine(`VAT @ ${data.vatRate.toFixed(0)}%`, `R${data.vatAmount.toFixed(2)}`, width)).newline()
  }
  buf.pushAll(CMD_BOLD_ON).pushAll(CMD_DOUBLE_HEIGHT)
  buf.text(padLine('TOTAL', `R${data.total.toFixed(2)}`, Math.floor(width / 2))).newline()
  buf.pushAll(CMD_NORMAL_SIZE).pushAll(CMD_BOLD_OFF)

  buf.newline()
  buf.pushAll(CMD_ALIGN_CENTER)
  buf.text('Thank you!').newline()
  buf.text('Powered by stoki').newline()

  buf.pushAll(CMD_FEED_3_LINES)
  buf.pushAll(CMD_CUT_PARTIAL)

  return buf.toBytes()
}
