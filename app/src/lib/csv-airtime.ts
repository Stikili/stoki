// Pure parser for airtime-PIN bulk-upload CSVs. SMME owners get a printed
// or emailed batch of vouchers from their distributor and load them into
// Stoki via this format.
//
// Required column: `pin`. Optional: `serial`, `expires_at` (ISO date).
//
// Pure-logic, no I/O. Tested in csv-airtime.test.ts.

export interface AirtimePinCsvRow {
  pin: string
  serial: string | null
  expiresAt: string | null
}

export interface ParsedAirtimePinCsv {
  rows: AirtimePinCsvRow[]
  errors: { line: number; message: string }[]
}

const ALL_HEADERS = ['pin', 'serial', 'expires_at'] as const

export function parseAirtimePinCsv(csv: string): ParsedAirtimePinCsv {
  const rows: AirtimePinCsvRow[] = []
  const errors: { line: number; message: string }[] = []

  if (csv.trim() === '') {
    errors.push({ line: 0, message: 'File is empty' })
    return { rows, errors }
  }

  const lines = splitLines(csv)
  const headerCells = parseRow(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const headerIndex: Record<string, number> = {}
  for (const expected of ALL_HEADERS) {
    const idx = headerCells.indexOf(expected)
    if (idx >= 0) headerIndex[expected] = idx
  }

  if (headerIndex.pin === undefined) {
    errors.push({
      line: 1,
      message: 'Missing required column "pin". Expected headers: pin (required), serial, expires_at',
    })
    return { rows, errors }
  }

  // Detect duplicate PINs in the same upload — the distributor occasionally
  // duplicates rows, and re-dispensing the same voucher would short-pay
  // the second customer. Surface as an error rather than silently dropping.
  const seen = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue
    const cells = parseRow(line)
    const lineNumber = i + 1

    const pin = (cells[headerIndex.pin] ?? '').trim()
    if (!pin) {
      errors.push({ line: lineNumber, message: 'Missing PIN' })
      continue
    }
    if (seen.has(pin)) {
      errors.push({ line: lineNumber, message: `Duplicate PIN "${pin}" in upload` })
      continue
    }
    seen.add(pin)

    const serial = headerIndex.serial !== undefined
      ? ((cells[headerIndex.serial] ?? '').trim() || null)
      : null

    let expiresAt: string | null = null
    if (headerIndex.expires_at !== undefined) {
      const raw = (cells[headerIndex.expires_at] ?? '').trim()
      if (raw) {
        const iso = normaliseExpiry(raw)
        if (!iso) {
          errors.push({ line: lineNumber, message: `Could not parse expiry date "${raw}"` })
          continue
        }
        expiresAt = iso
      }
    }

    rows.push({ pin, serial, expiresAt })
  }

  return { rows, errors }
}

function splitLines(csv: string): string[] {
  return csv.replace(/\r\n?/g, '\n').split('\n')
}

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

/** Accept ISO YYYY-MM-DD or DD/MM/YYYY (SA convention). Output ISO. */
export function normaliseExpiry(raw: string): string | null {
  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}
