// Pure parser for South-African bank-statement CSV exports.
// Handles FNB, Nedbank, ABSA, Capitec, Standard Bank — they all use slightly
// different column names so we auto-detect by keyword. The output normalises
// to: signed amount (positive = credit/deposit, negative = debit/withdrawal).
//
// Pure-logic, no I/O. Tested in csv-bank-statement.test.ts.

export interface BankStatementLine {
  /** Original 1-based row number in the source file (header is row 1). */
  rowNumber: number
  /** ISO YYYY-MM-DD. */
  date: string
  description: string
  /** Signed: positive = money in (credit), negative = money out (debit). */
  amount: number
  /** Optional reference / extra column the bank may include. */
  reference: string | null
}

export interface ParsedBankStatement {
  lines: BankStatementLine[]
  errors: { line: number; message: string }[]
  /** Headers we recognised, for surfacing in the UI ("matched FNB format"). */
  detectedFormat: string
}

const DATE_KEYS = ['date', 'transaction date', 'trans date', 'date posted', 'posting date', 'value date']
const DESCRIPTION_KEYS = ['description', 'details', 'narration', 'transaction', 'transaction description']
const REFERENCE_KEYS = ['reference', 'ref', 'memo']
const AMOUNT_KEYS = ['amount']
const DEBIT_KEYS = ['debit', 'amount debit', 'money out', 'withdrawal', 'withdrawals']
const CREDIT_KEYS = ['credit', 'amount credit', 'money in', 'deposit', 'deposits']

/**
 * Stable fingerprint for a bank-statement line description used as part of
 * the deduplication key in `bank_reconciliations`. Lowercased, whitespace
 * collapsed, capped at 200 characters to match the DB column.
 */
export function descriptionFingerprint(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200)
}

export function parseBankStatementCsv(csv: string): ParsedBankStatement {
  const lines: BankStatementLine[] = []
  const errors: { line: number; message: string }[] = []

  if (csv.trim() === '') {
    errors.push({ line: 0, message: 'File is empty' })
    return { lines, errors, detectedFormat: 'unknown' }
  }

  const rawLines = splitLines(csv)
  // Some banks emit a few preamble rows ("Account: ...", blank, etc.) before
  // the real header. Find the first row that looks like a header (contains a
  // date keyword and at least one amount-ish keyword).
  let headerIdx = -1
  let headerCells: string[] = []
  for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
    const cells = parseRow(rawLines[i]).map((c) => c.trim().toLowerCase())
    const hasDate = cells.some((c) => DATE_KEYS.includes(c))
    const hasAmount = cells.some((c) =>
      AMOUNT_KEYS.includes(c) || DEBIT_KEYS.includes(c) || CREDIT_KEYS.includes(c),
    )
    if (hasDate && hasAmount) {
      headerIdx = i
      headerCells = cells
      break
    }
  }

  if (headerIdx === -1) {
    errors.push({
      line: 1,
      message: 'Could not find a header row with date + amount columns. Expected something like "Date, Description, Amount" or "Date, Description, Money In, Money Out".',
    })
    return { lines, errors, detectedFormat: 'unknown' }
  }

  const findIdx = (keys: readonly string[]): number => {
    for (const key of keys) {
      const idx = headerCells.indexOf(key)
      if (idx >= 0) return idx
    }
    return -1
  }

  const dateIdx = findIdx(DATE_KEYS)
  const descIdx = findIdx(DESCRIPTION_KEYS)
  const refIdx = findIdx(REFERENCE_KEYS)
  const amountIdx = findIdx(AMOUNT_KEYS)
  const debitIdx = findIdx(DEBIT_KEYS)
  const creditIdx = findIdx(CREDIT_KEYS)

  // Either a single signed Amount column, or split debit/credit columns.
  const usesSignedAmount = amountIdx >= 0 && debitIdx === -1 && creditIdx === -1
  if (!usesSignedAmount && (debitIdx === -1 || creditIdx === -1) && amountIdx === -1) {
    errors.push({
      line: headerIdx + 1,
      message: 'No amount columns found. Need either an "Amount" column or both "Money In/Money Out" (or "Credit/Debit").',
    })
    return { lines, errors, detectedFormat: 'unknown' }
  }

  const detectedFormat = usesSignedAmount ? 'signed-amount' : 'split-debit-credit'

  for (let i = headerIdx + 1; i < rawLines.length; i++) {
    const line = rawLines[i]
    if (line.trim() === '') continue
    const cells = parseRow(line)
    const lineNumber = i + 1

    const rawDate = (cells[dateIdx] ?? '').trim()
    const date = normaliseDate(rawDate)
    if (!date) {
      errors.push({ line: lineNumber, message: `Could not parse date "${rawDate}"` })
      continue
    }

    const description = descIdx >= 0 ? (cells[descIdx] ?? '').trim() : ''
    const reference = refIdx >= 0 ? ((cells[refIdx] ?? '').trim() || null) : null

    let amount: number | null = null
    if (usesSignedAmount) {
      amount = parseAmount((cells[amountIdx] ?? '').trim())
    } else {
      const debitRaw = debitIdx >= 0 ? (cells[debitIdx] ?? '').trim() : ''
      const creditRaw = creditIdx >= 0 ? (cells[creditIdx] ?? '').trim() : ''
      const debit = parseAmount(debitRaw)
      const credit = parseAmount(creditRaw)
      // Banks vary: sometimes both columns have a value of 0, sometimes only one
      // is filled, sometimes the debit is reported as a positive number.
      if (credit !== null && credit !== 0) amount = Math.abs(credit)
      else if (debit !== null && debit !== 0) amount = -Math.abs(debit)
      else if (amountIdx >= 0) amount = parseAmount((cells[amountIdx] ?? '').trim())
      else amount = 0
    }

    if (amount === null || !Number.isFinite(amount)) {
      errors.push({ line: lineNumber, message: 'Invalid amount' })
      continue
    }

    if (amount === 0) continue // Skip zero-value rows (closing balance lines, etc.)

    lines.push({
      rowNumber: lineNumber,
      date,
      description,
      amount,
      reference,
    })
  }

  return { lines, errors, detectedFormat }
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

/**
 * Normalise common SA date formats to ISO YYYY-MM-DD.
 * Accepts: 2026-04-15, 15/04/2026, 15-04-2026, 15 Apr 2026, 2026/04/15.
 * Returns null if unparseable.
 */
export function normaliseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // Already ISO? (YYYY-MM-DD or YYYY/MM/DD)
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (m) {
    const [, y, mo, d] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD/MM/YYYY or DD-MM-YYYY (SA convention).
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD Mon YYYY (e.g. "15 Apr 2026") — month name short-form.
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  m = s.toLowerCase().match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    const mm = monthMap[mo]
    if (mm) return `${y}-${mm}-${d.padStart(2, '0')}`
  }

  // Fall back to Date.parse (handles ISO with time, US-style, etc.).
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

/**
 * Parse SA-formatted money amount: "1 234.56", "1,234.56", "R 1234.56", "(123.45)" (parens = negative).
 * Returns null when the cell isn't parseable as a number.
 */
export function parseAmount(s: string): number | null {
  if (!s) return null
  let cleaned = s.replace(/[Rr$\s]/g, '')
  // Parens-style negatives common in accounting exports: (123.45) → -123.45
  let isNegative = false
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true
    cleaned = cleaned.slice(1, -1)
  }
  // SA banks sometimes use ',' as thousands separator and '.' as decimal,
  // sometimes the other way. If both appear, last-occurring symbol is the decimal.
  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (lastComma >= 0 && lastDot < 0) {
    // Comma might be thousands ("1,234") or decimal ("1,23"). Treat as decimal
    // only if there are 1-2 digits after it; otherwise drop as thousands.
    const after = cleaned.length - 1 - lastComma
    if (after === 1 || after === 2) cleaned = cleaned.replace(',', '.')
    else cleaned = cleaned.replace(/,/g, '')
  }
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  return isNegative ? -Math.abs(n) : n
}
