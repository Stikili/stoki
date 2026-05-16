'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import { Invoice } from '@/domain/entities/invoice'
import { Expense, EXPENSE_CATEGORIES } from '@/domain/entities/expense'
import { parseBankStatementCsv, ParsedBankStatement, descriptionFingerprint } from '@/lib/csv-bank-statement'
import { matchStatement, MatchedStatementLine } from '@/application/reconcile/matchStatement'
import { compositeKey } from '@/infrastructure/supabase/repositories/BankReconciliationRepository'
import {
  applyInvoicePaymentAction,
  recordReconcileExpenseAction,
  skipLineAction,
} from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import { Upload, Check, X, RotateCcw } from 'lucide-react'

type ResolvedStatus = 'pending' | 'matched' | 'expensed' | 'skipped' | 'already_handled'

const SAMPLE_CSV = `Date,Description,Amount,Balance
2026-04-15,POS PURCHASE WOOLWORTHS,-150.00,4850.00
2026-04-16,EFT INVOICE 1042 ACME CO,2300.00,7150.00
2026-04-17,CASH DEPOSIT,500.00,7650.00
2026-04-18,CARD CITY LODGE,-1200.00,6450.00
`

export default function ReconcileClient({
  openInvoices,
  recentExpenses,
  resolvedKeys,
}: {
  openInvoices: Invoice[]
  recentExpenses: Expense[]
  /** Composite key strings from the server: `${statementDate}|${amount}|${descFp}` */
  resolvedKeys: string[]
}) {
  const { toast } = useToast()
  const resolvedSet = useMemo(() => new Set(resolvedKeys), [resolvedKeys])

  const [csvText, setCsvText] = useState('')
  const [parsed, setParsed] = useState<ParsedBankStatement | null>(null)
  const [matched, setMatched] = useState<MatchedStatementLine[]>([])
  const [statuses, setStatuses] = useState<Record<number, ResolvedStatus>>({})
  const [expenseSheet, setExpenseSheet] = useState<MatchedStatementLine | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInput = useRef<HTMLInputElement>(null)

  const summary = useMemo(() => {
    let totalIn = 0, totalOut = 0
    let matchedCount = 0
    for (const m of matched) {
      if (m.line.amount > 0) totalIn += m.line.amount
      else totalOut += Math.abs(m.line.amount)
      const s = statuses[m.line.rowNumber] ?? 'pending'
      if (s !== 'pending') matchedCount++
    }
    return { totalIn, totalOut, matchedCount, total: matched.length }
  }, [matched, statuses])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCsvText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  function handleParse() {
    if (!csvText.trim()) return
    const result = parseBankStatementCsv(csvText)
    setParsed(result)
    if (result.errors.length > 0 && result.lines.length === 0) {
      toast(result.errors[0].message, 'error')
      return
    }
    const m = matchStatement(result.lines, openInvoices, recentExpenses)

    // Pre-populate statuses for lines already in the DB.
    const initialStatuses: Record<number, ResolvedStatus> = {}
    for (const row of m) {
      const fp = descriptionFingerprint(row.line.description)
      const key = compositeKey(row.line.date, row.line.amount, fp)
      if (resolvedSet.has(key)) {
        initialStatuses[row.line.rowNumber] = 'already_handled'
      }
    }

    setMatched(m)
    setStatuses(initialStatuses)
    haptic(30)
  }

  function downloadSampleCsv() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'stoki-bank-statement-sample.csv'
    a.click()
  }

  function confirmInvoiceMatch(m: MatchedStatementLine) {
    if (m.best?.kind !== 'invoice') return
    const best = m.best
    startTransition(async () => {
      try {
        await applyInvoicePaymentAction(
          best.invoiceId,
          m.line.amount,
          m.line.date,
          m.line.reference ?? m.line.description,
          m.line.date,
          m.line.description,
        )
        setStatuses((prev) => ({ ...prev, [m.line.rowNumber]: 'matched' }))
        haptic(40)
        toast(`Invoice #${best.invoiceNumber} marked paid`)
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to record payment', 'error')
      }
    })
  }

  function recordExpense(m: MatchedStatementLine, category: string) {
    startTransition(async () => {
      try {
        await recordReconcileExpenseAction(
          category,
          m.line.description || 'Bank reconcile',
          Math.abs(m.line.amount),
          m.line.date,
          m.line.date,
          m.line.description,
        )
        setStatuses((prev) => ({ ...prev, [m.line.rowNumber]: 'expensed' }))
        setExpenseSheet(null)
        haptic(40)
        toast(`Expense of R${Math.abs(m.line.amount).toFixed(2)} recorded`)
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to record expense', 'error')
      }
    })
  }

  function skipLine(m: MatchedStatementLine) {
    setStatuses((prev) => ({ ...prev, [m.line.rowNumber]: 'skipped' }))
    // Persist the skip so it's not re-shown on re-upload.
    startTransition(async () => {
      try {
        await skipLineAction(m.line.date, m.line.amount, m.line.description)
      } catch { /* non-critical — local status already updated */ }
    })
  }

  function overrideLine(rowNumber: number) {
    setStatuses((prev) => ({ ...prev, [rowNumber]: 'pending' }))
  }

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-2">Reconcile bank statement</h1>
      <p className="text-muted text-sm mb-5">
        Upload a CSV from your bank. We&apos;ll match deposits to your open invoices and
        flag unrecorded expenses.
      </p>

      {!parsed && (
        <div className="card p-5 mb-4">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>1. Upload statement</p>

          <button onClick={downloadSampleCsv} className="text-brand text-sm font-semibold mb-3 inline-flex items-center gap-1">
            ↓ Download sample CSV format
          </button>

          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-sm mb-3 text-muted"
          />

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="…or paste CSV content here"
            rows={6}
            className="input font-mono text-xs"
          />

          <button
            onClick={handleParse}
            disabled={!csvText.trim()}
            className="btn-primary mt-3"
            style={{ opacity: csvText.trim() ? 1 : 0.5 }}
          >
            <Upload size={16} className="inline mr-2" />
            Parse statement
          </button>
        </div>
      )}

      {parsed && parsed.errors.length > 0 && (
        <div className="card p-3 mb-4" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
          <p className="text-xs font-semibold text-warning">Parse warnings</p>
          <ul className="text-xs text-muted mt-1 space-y-0.5">
            {parsed.errors.slice(0, 5).map((e, i) => (
              <li key={i}>Line {e.line}: {e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {parsed && matched.length > 0 && (
        <>
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                {summary.total} line{summary.total === 1 ? '' : 's'} · {parsed.detectedFormat}
              </p>
              <button
                onClick={() => { setParsed(null); setMatched([]); setStatuses({}); setCsvText('') }}
                className="text-xs text-muted hover:text-white"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center mt-2">
              <div>
                <p className="text-brand text-sm font-bold">+R{summary.totalIn.toFixed(2)}</p>
                <p className="text-muted text-[10px] uppercase">Money in</p>
              </div>
              <div>
                <p className="text-danger text-sm font-bold">−R{summary.totalOut.toFixed(2)}</p>
                <p className="text-muted text-[10px] uppercase">Money out</p>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                  {summary.matchedCount}/{summary.total}
                </p>
                <p className="text-muted text-[10px] uppercase">Resolved</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {matched.map((m) => {
              const status = statuses[m.line.rowNumber] ?? 'pending'
              const isCredit = m.line.amount > 0
              return (
                <div
                  key={m.line.rowNumber}
                  className="card p-3"
                  style={
                    status === 'matched' || status === 'expensed'
                      ? { borderColor: 'rgba(0,200,150,0.3)' }
                      : status === 'skipped' || status === 'already_handled'
                        ? { opacity: 0.5 }
                        : {}
                  }
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--foreground)' }}>
                        {m.line.description || '(no description)'}
                      </p>
                      <p className="text-muted text-[10px] mt-0.5">
                        {m.line.date}{m.line.reference ? ` · ${m.line.reference}` : ''}
                      </p>
                    </div>
                    <span className={`text-sm font-bold whitespace-nowrap ${isCredit ? 'text-brand' : 'text-danger'}`}>
                      {isCredit ? '+' : '−'}R{Math.abs(m.line.amount).toFixed(2)}
                    </span>
                  </div>

                  {status === 'pending' && m.best?.kind === 'invoice' && (
                    <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs" style={{ color: 'var(--foreground)' }}>
                          <span className={`pill ${m.best.confidence === 'high' ? 'pill-green' : m.best.confidence === 'medium' ? 'pill-yellow' : 'pill-blue'} min-h-0 text-[9px] mr-1.5`}>
                            {m.best.confidence}
                          </span>
                          INV #{m.best.invoiceNumber}{m.best.customerName ? ` · ${m.best.customerName}` : ''}
                        </p>
                        <p className="text-muted text-[10px] mt-0.5">{m.best.reason}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => skipLine(m)} disabled={isPending} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                          <X size={14} color="#7B8CA1" />
                        </button>
                        <button onClick={() => confirmInvoiceMatch(m)} disabled={isPending} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#00C896' }}>
                          <Check size={14} color="#0A0E17" strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  )}

                  {status === 'pending' && m.best?.kind === 'expense' && (
                    <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">
                          <span className="pill pill-blue min-h-0 text-[9px] mr-1.5">{m.best.confidence}</span>
                          Already in your books: {m.best.description}
                        </p>
                      </div>
                      <button onClick={() => skipLine(m)} disabled={isPending} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
                        OK
                      </button>
                    </div>
                  )}

                  {status === 'pending' && m.best === null && !isCredit && (
                    <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <p className="text-xs text-muted">Not in your books</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => skipLine(m)} disabled={isPending} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
                          Skip
                        </button>
                        <button onClick={() => setExpenseSheet(m)} disabled={isPending} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#F59E0B', color: '#0A0E17' }}>
                          Record expense
                        </button>
                      </div>
                    </div>
                  )}

                  {status === 'pending' && m.best === null && isCredit && (
                    <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <p className="text-xs text-muted">No matching invoice</p>
                      <button onClick={() => skipLine(m)} disabled={isPending} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
                        Skip
                      </button>
                    </div>
                  )}

                  {status === 'matched' && (
                    <p className="text-xs text-brand pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      ✓ Matched to invoice
                    </p>
                  )}
                  {status === 'expensed' && (
                    <p className="text-xs text-brand pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      ✓ Expense recorded
                    </p>
                  )}
                  {status === 'skipped' && (
                    <p className="text-xs text-muted pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      Skipped
                    </p>
                  )}
                  {status === 'already_handled' && (
                    <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                      <p className="text-xs text-muted">Already handled in a previous session</p>
                      <button
                        onClick={() => overrideLine(m.line.rowNumber)}
                        className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
                      >
                        <RotateCcw size={10} />
                        Override
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Record-expense sheet */}
      {expenseSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setExpenseSheet(null)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Record expense</h2>
            <p className="text-muted text-sm mb-1 truncate">{expenseSheet.line.description}</p>
            <p className="text-muted text-xs mb-4">
              {expenseSheet.line.date} · R{Math.abs(expenseSheet.line.amount).toFixed(2)}
            </p>
            <p className="text-muted text-xs ml-1 mb-2 uppercase font-semibold tracking-widest">Category</p>
            <div className="grid grid-cols-2 gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => recordExpense(expenseSheet, c.key)}
                  disabled={isPending}
                  className="card p-3 text-left text-sm"
                  style={{ color: 'var(--foreground)' }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
