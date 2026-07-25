// Pure parser for bulk-product CSV uploads. Pure-logic, no I/O.
// Tested in csv-products.test.ts.

export interface ProductCsvRow {
  name: string
  price: number
  cost: number
  qty: number
  reorderPoint: number
  sku: string | null
  /** Optional weighable-goods label. Populated when the CSV row supplies
   *  a `unit_label` column with one of the accepted unit slugs; when
   *  omitted the column is left unset and the product defaults to 'each'
   *  server-side. Post-migration-015, qty / reorder_point are numeric(10,3)
   *  so weighables like "1.500 kg Rice" fit natively. */
  unitLabel: 'each' | 'kg' | 'g' | 'l' | 'ml' | null
}

export interface ParsedProductCsv {
  rows: ProductCsvRow[]
  errors: { line: number; message: string }[]
}

const REQUIRED_HEADERS = ['name', 'price'] as const
const ALL_HEADERS = ['name', 'price', 'cost', 'qty', 'reorder_point', 'sku', 'unit_label'] as const

/** Valid weighable/pourable unit labels. Anything else in the column
 *  falls back to null (product defaults to 'each' server-side). */
const VALID_UNIT_LABELS = new Set(['each', 'kg', 'g', 'l', 'ml'])

export const SAMPLE_CSV = `name,price,cost,qty,reorder_point,sku,unit_label
White Bread (700g),16.99,12.00,20,10,BREAD-W-700,each
Coke 340ml Can,16.99,12.00,40,15,COKE-340,each
Maggi Noodles,3.99,2.50,80,20,MAGGI-CHK,each
Rice (loose),25.00,18.00,50.500,10,RICE-L,kg
Sunflower Oil (bulk),42.00,32.00,20.000,5,OIL-B,l
`

/**
 * Parse a CSV string into product rows. Handles:
 *  - Header row (column order can vary; required: name, price)
 *  - Quoted values with embedded commas (`"Coke (2L)"`)
 *  - Doubled quotes inside quoted values (`""`)
 *  - Empty / whitespace lines (skipped)
 *  - Per-row errors collected without aborting the whole file
 *
 * Returns BOTH the valid rows and a list of per-row errors so the caller
 * can show a preview screen before committing.
 */
export function parseProductCsv(csv: string): ParsedProductCsv {
  const rows: ProductCsvRow[] = []
  const errors: { line: number; message: string }[] = []

  if (csv.trim() === '') {
    errors.push({ line: 0, message: 'File is empty' })
    return { rows, errors }
  }

  const lines = splitLines(csv)

  const headerCells = parseRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const headerIndex: Record<string, number> = {}
  for (const expected of ALL_HEADERS) {
    const idx = headerCells.indexOf(expected)
    if (idx >= 0) headerIndex[expected] = idx
  }

  for (const required of REQUIRED_HEADERS) {
    if (headerIndex[required] === undefined) {
      errors.push({
        line: 1,
        message: `Missing required column "${required}". Expected headers: ${ALL_HEADERS.join(', ')}`,
      })
      return { rows, errors }
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue
    const cells = parseRow(line)
    const lineNumber = i + 1

    const name = (cells[headerIndex.name] ?? '').trim()
    if (!name) {
      errors.push({ line: lineNumber, message: 'Missing product name' })
      continue
    }

    const priceRaw = (cells[headerIndex.price] ?? '').trim()
    const price = parseDecimal(priceRaw)
    if (price === null || price < 0) {
      errors.push({ line: lineNumber, message: `Invalid price "${priceRaw}"` })
      continue
    }

    const cost = headerIndex.cost !== undefined
      ? (parseDecimal((cells[headerIndex.cost] ?? '').trim()) ?? 0)
      : 0
    // qty + reorder_point are numeric(10,3) post-migration-015 so a
    // 1.500 kg rice entry stays as 1.5 not 1. parseDecimal accepts
    // integers uniformly so nothing regresses for whole-unit imports.
    const qty = headerIndex.qty !== undefined
      ? (parseDecimal((cells[headerIndex.qty] ?? '').trim()) ?? 0)
      : 0
    const reorderPoint = headerIndex.reorder_point !== undefined
      ? (parseDecimal((cells[headerIndex.reorder_point] ?? '').trim()) ?? 5)
      : 5
    const sku = headerIndex.sku !== undefined
      ? ((cells[headerIndex.sku] ?? '').trim() || null)
      : null

    // Weighable unit label — accept the canonical slug or fall back to
    // null so the caller can default 'each' server-side. Unknown labels
    // silently drop (better than blocking a whole import over a typo).
    let unitLabel: ProductCsvRow['unitLabel'] = null
    if (headerIndex.unit_label !== undefined) {
      const raw = (cells[headerIndex.unit_label] ?? '').trim().toLowerCase()
      if (raw && VALID_UNIT_LABELS.has(raw)) {
        unitLabel = raw as ProductCsvRow['unitLabel']
      }
    }

    if (cost < 0) {
      errors.push({ line: lineNumber, message: `Cost cannot be negative` })
      continue
    }
    if (qty < 0) {
      errors.push({ line: lineNumber, message: `Qty cannot be negative` })
      continue
    }

    rows.push({ name, price, cost, qty, reorderPoint, sku, unitLabel })
  }

  return { rows, errors }
}

function splitLines(csv: string): string[] {
  // Handle CRLF, LF, and CR line endings.
  return csv.replace(/\r\n?/g, '\n').split('\n')
}

// Parse a single CSV row, respecting quoted values and embedded commas/quotes.
function parseRow(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
    } else {
      if (ch === '"' && cell === '') {
        inQuotes = true
      } else if (ch === ',') {
        cells.push(cell)
        cell = ''
      } else {
        cell += ch
      }
    }
  }
  cells.push(cell)
  return cells
}

function parseDecimal(s: string): number | null {
  if (s === '') return null
  const cleaned = s.replace(/[^\d.\-]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

// Kept for callers that specifically want integer parsing; internal
// qty / reorder_point parsing switched to parseDecimal so weighable
// imports work. Any future integer-only CSV field can use this.
function parseInteger(s: string): number | null {
  if (s === '') return null
  const cleaned = s.replace(/[^\d\-]/g, '')
  const n = parseInt(cleaned, 10)
  return Number.isFinite(n) ? n : null
}
// Silence unused-var lint on parseInteger (retained intentionally).
void parseInteger
