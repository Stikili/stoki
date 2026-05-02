import { Invoice, balanceOf } from '@/domain/entities/invoice'
import { Expense } from '@/domain/entities/expense'
import { BankStatementLine } from '@/lib/csv-bank-statement'

export type MatchConfidence = 'high' | 'medium' | 'low' | 'none'

export interface InvoiceMatch {
  kind: 'invoice'
  invoiceId: string
  invoiceNumber: number
  customerName: string | null
  balance: number
  confidence: MatchConfidence
  reason: string
}

export interface ExpenseMatch {
  kind: 'expense'
  expenseId: string
  description: string
  amount: number
  confidence: MatchConfidence
  reason: string
}

export type Match = InvoiceMatch | ExpenseMatch

export interface MatchedStatementLine {
  line: BankStatementLine
  /** Best candidate match (highest confidence). Empty when nothing fits. */
  best: Match | null
  /** All candidates considered, in case the user wants to override the best pick. */
  candidates: Match[]
}

const AMOUNT_EPS = 0.01

/**
 * Try to match each parsed statement line to either an open invoice (credits)
 * or a recently-recorded expense (debits). Returns one annotated row per
 * statement line with the best candidate plus alternatives the UI can offer.
 */
export function matchStatement(
  lines: BankStatementLine[],
  invoices: Invoice[],
  expenses: Expense[],
): MatchedStatementLine[] {
  return lines.map((line) => {
    const candidates: Match[] = line.amount > 0
      ? matchInvoices(line, invoices)
      : matchExpenses(line, expenses)

    candidates.sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence))

    return {
      line,
      best: candidates[0] ?? null,
      candidates,
    }
  })
}

function matchInvoices(line: BankStatementLine, invoices: Invoice[]): InvoiceMatch[] {
  const haystack = `${line.description} ${line.reference ?? ''}`.toLowerCase()
  const candidates: InvoiceMatch[] = []

  for (const inv of invoices) {
    const balance = balanceOf(inv)
    if (balance <= 0) continue

    const amountMatchesBalance = Math.abs(line.amount - balance) < AMOUNT_EPS
    const amountMatchesTotal = Math.abs(line.amount - inv.total) < AMOUNT_EPS
    const numberStr = String(inv.invoiceNumber)
    const numberInDescription = numberStr.length >= 3 && haystack.includes(numberStr)
    const customerInDescription =
      inv.customerName != null &&
      inv.customerName.length >= 3 &&
      haystack.includes(inv.customerName.toLowerCase())

    let confidence: MatchConfidence = 'none'
    let reason = ''

    if (numberInDescription && (amountMatchesBalance || amountMatchesTotal)) {
      confidence = 'high'
      reason = `Invoice #${numberStr} referenced and amount matches`
    } else if (amountMatchesBalance && customerInDescription) {
      confidence = 'high'
      reason = `Customer name matches and amount = balance`
    } else if (amountMatchesBalance) {
      confidence = 'medium'
      reason = `Amount matches outstanding balance`
    } else if (numberInDescription) {
      confidence = 'low'
      reason = `Invoice #${numberStr} referenced but amount differs`
    } else {
      continue
    }

    candidates.push({
      kind: 'invoice',
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      balance,
      confidence,
      reason,
    })
  }

  return candidates
}

function matchExpenses(line: BankStatementLine, expenses: Expense[]): ExpenseMatch[] {
  const debit = Math.abs(line.amount)
  const lineDate = new Date(line.date)
  const candidates: ExpenseMatch[] = []

  for (const e of expenses) {
    const amountMatches = Math.abs(e.amount - debit) < AMOUNT_EPS
    if (!amountMatches) continue

    const expenseDate = new Date(e.recordedAt)
    const daysApart = Math.abs((expenseDate.getTime() - lineDate.getTime()) / 86_400_000)

    let confidence: MatchConfidence = 'low'
    let reason = `Amount matches existing expense`
    if (daysApart <= 1) {
      confidence = 'high'
      reason = `Amount + date match (${e.description})`
    } else if (daysApart <= 7) {
      confidence = 'medium'
      reason = `Amount matches expense from ${Math.round(daysApart)}d ago`
    }

    candidates.push({
      kind: 'expense',
      expenseId: e.id,
      description: e.description,
      amount: e.amount,
      confidence,
      reason,
    })
  }

  return candidates
}

function confidenceRank(c: MatchConfidence): number {
  switch (c) {
    case 'high': return 3
    case 'medium': return 2
    case 'low': return 1
    case 'none': return 0
  }
}
