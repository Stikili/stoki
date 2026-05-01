'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sale, PAYMENT_METHODS } from '@/domain/entities/sale'
import { Expense, EXPENSE_CATEGORIES } from '@/domain/entities/expense'
import { Restock } from '@/domain/entities/restock'
import { Store } from '@/domain/entities/store'
import { Printer, Download, ArrowLeft } from 'lucide-react'

type Tab = 'pnl' | 'sales' | 'vat'

function fmtMoney(n: number) {
  return `R${n.toFixed(2)}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function categoryLabel(key: string) {
  return EXPENSE_CATEGORIES.find(c => c.key === key)?.label ?? key
}

function methodLabel(key: string) {
  return PAYMENT_METHODS.find(m => m.value === key)?.label ?? key
}

interface Props {
  store: Store
  sales: Sale[]
  expenses: Expense[]
  restocks: Restock[]
  from: string
  to: string
}

export default function ReportsClient({ store, sales, expenses, restocks, from, to }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pnl')
  const [fromDate, setFromDate] = useState(from)
  const [toDate, setToDate] = useState(to)

  function applyRange() {
    const q = new URLSearchParams({ from: fromDate, to: toDate }).toString()
    router.push(`/reports?${q}`)
  }

  // P&L aggregates
  const pnl = useMemo(() => {
    let revenue = 0
    let cogs = 0
    for (const s of sales) {
      const sign = s.type === 'return' ? -1 : 1
      revenue += s.priceAtSale * s.qty * sign
      cogs += s.costAtSale * s.qty * sign
    }
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
    const expenseByCat = new Map<string, number>()
    for (const e of expenses) expenseByCat.set(e.category, (expenseByCat.get(e.category) ?? 0) + e.amount)
    const grossProfit = revenue - cogs
    const netProfit = grossProfit - expenseTotal
    return { revenue, cogs, grossProfit, expenseTotal, netProfit, expenseByCat }
  }, [sales, expenses])

  // VAT aggregates
  const vat = useMemo(() => {
    if (!store.vatRegistered) return null
    const rate = store.vatRate / 100
    let outputVat = 0
    for (const s of sales) {
      const sign = s.type === 'return' ? -1 : 1
      outputVat += s.vatAmount * sign
    }
    // Input VAT estimate — assumes restock costs are VAT-inclusive from VAT-registered suppliers (most majors are).
    // SA VAT201 fraction: cost × 15/115 = cost × rate/(1+rate)
    const inputVatEstimate = restocks.reduce((sum, r) => {
      if (!r.cost) return sum
      const lineCost = r.cost * r.qtyAdded
      return sum + (lineCost * rate) / (1 + rate)
    }, 0)
    return {
      outputVat,
      inputVatEstimate,
      netDue: outputVat - inputVatEstimate,
    }
  }, [sales, restocks, store.vatRegistered, store.vatRate])

  function downloadSalesCsv() {
    const header = ['Invoice #', 'Date', 'Time', 'Product', 'Qty', 'Unit Price', 'Total', 'VAT', 'Type', 'Payment', 'Channel']
    const rows = sales.map(s => [
      s.invoiceNumber != null ? `INV-${String(s.invoiceNumber).padStart(5, '0')}` : '',
      fmtDate(s.recordedAt),
      fmtTime(s.recordedAt),
      s.productName ?? '',
      String(s.qty),
      s.priceAtSale.toFixed(2),
      (s.priceAtSale * s.qty).toFixed(2),
      s.vatAmount.toFixed(2),
      s.type,
      methodLabel(s.paymentMethod),
      s.channel,
    ])
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sales_${from}_${to}.csv`
    a.click()
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 print:hidden">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <ArrowLeft size={18} color="#7B8CA1" />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Reports</h1>
      </div>

      {/* Date range */}
      <div className="card p-4 mb-4 print:hidden">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Period</p>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" />
        </div>
        <button onClick={applyRange} className="btn-primary mt-3">Apply</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 print:hidden">
        {(['pnl', 'sales', 'vat'] as const).map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            disabled={tb === 'vat' && !store.vatRegistered}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={tab === tb
              ? { background: '#00C896', color: '#0A0E17' }
              : { background: 'var(--card-bg)', color: 'var(--muted)', border: '1px solid var(--card-border)', opacity: tb === 'vat' && !store.vatRegistered ? 0.4 : 1 }}
          >
            {tb === 'pnl' ? 'P&L' : tb === 'sales' ? 'Sales' : 'VAT'}
          </button>
        ))}
      </div>

      {tab === 'pnl' && (
        <PnlReport store={store} pnl={pnl} fromIso={from} toIso={to} salesCount={sales.length} />
      )}

      {tab === 'sales' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{sales.length} sales · {fmtDate(from)} → {fmtDate(to)}</p>
            <button onClick={downloadSalesCsv} className="text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5" style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}>
              <Download size={12} /> CSV
            </button>
          </div>
          {sales.length === 0 ? (
            <p className="text-center text-muted py-12">No sales in this period</p>
          ) : (
            <div className="card p-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted">
                      <th className="text-left p-2 font-semibold">Date</th>
                      <th className="text-left p-2 font-semibold">Product</th>
                      <th className="text-right p-2 font-semibold">Qty</th>
                      <th className="text-right p-2 font-semibold">Total</th>
                      <th className="text-right p-2 font-semibold">VAT</th>
                      <th className="text-left p-2 font-semibold">Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(s => (
                      <tr key={s.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                        <td className="p-2 whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{fmtDate(s.recordedAt)}</td>
                        <td className="p-2 truncate max-w-[120px]" style={{ color: 'var(--foreground)' }}>{s.productName ?? '—'}</td>
                        <td className="p-2 text-right" style={{ color: 'var(--foreground)' }}>{s.type === 'return' ? `-${s.qty}` : s.qty}</td>
                        <td className="p-2 text-right" style={{ color: s.type === 'return' ? '#EF4444' : 'var(--foreground)' }}>
                          {s.type === 'return' ? '-' : ''}{fmtMoney(s.priceAtSale * s.qty)}
                        </td>
                        <td className="p-2 text-right text-muted">{fmtMoney(s.vatAmount)}</td>
                        <td className="p-2 text-muted whitespace-nowrap">{methodLabel(s.paymentMethod)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'vat' && store.vatRegistered && vat && (
        <VatReport store={store} vat={vat} fromIso={from} toIso={to} />
      )}
    </>
  )
}

function PnlReport({
  store,
  pnl,
  fromIso,
  toIso,
  salesCount,
}: {
  store: Store
  pnl: { revenue: number; cogs: number; grossProfit: number; expenseTotal: number; netProfit: number; expenseByCat: Map<string, number> }
  fromIso: string
  toIso: string
  salesCount: number
}) {
  const grossPct = pnl.revenue > 0 ? (pnl.grossProfit / pnl.revenue) * 100 : 0
  const netPct = pnl.revenue > 0 ? (pnl.netProfit / pnl.revenue) * 100 : 0

  return (
    <div className="print-area">
      <div className="hidden print:block mb-4 text-black">
        <p className="font-bold text-lg">{store.name}</p>
        {store.businessAddress && <p className="text-xs whitespace-pre-line">{store.businessAddress}</p>}
        {store.vatRegistered && store.vatNumber && <p className="text-xs">VAT No: {store.vatNumber}</p>}
        <p className="text-xs mt-2">Profit &amp; Loss · {fmtDate(fromIso)} → {fmtDate(toIso)}</p>
      </div>

      <div className="card p-5 mb-3">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest">Net Profit</p>
        <p className={`text-3xl font-bold mt-1 ${pnl.netProfit >= 0 ? 'text-brand' : 'text-danger'}`}>{fmtMoney(pnl.netProfit)}</p>
        <p className="text-muted text-xs mt-1">{netPct.toFixed(1)}% net margin · {salesCount} sales</p>
      </div>

      <div className="card p-4 mb-3">
        <Row label="Revenue" value={fmtMoney(pnl.revenue)} />
        <Row label="Cost of goods sold" value={`-${fmtMoney(pnl.cogs)}`} muted />
        <RowBold label="Gross profit" value={fmtMoney(pnl.grossProfit)} hint={`${grossPct.toFixed(1)}% margin`} />
      </div>

      <div className="card p-4 mb-3">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">Expenses</p>
        {pnl.expenseByCat.size === 0 ? (
          <p className="text-muted text-sm">No expenses recorded</p>
        ) : (
          <>
            {[...pnl.expenseByCat.entries()].sort((a, b) => b[1] - a[1]).map(([key, amt]) => (
              <Row key={key} label={categoryLabel(key)} value={`-${fmtMoney(amt)}`} muted />
            ))}
            <RowBold label="Total expenses" value={`-${fmtMoney(pnl.expenseTotal)}`} />
          </>
        )}
      </div>

      <div className="card p-4 mb-4">
        <RowBold
          label="Net profit"
          value={fmtMoney(pnl.netProfit)}
          valueColor={pnl.netProfit >= 0 ? '#00C896' : '#EF4444'}
        />
      </div>

      <button
        onClick={() => window.print()}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 print:hidden"
        style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}
      >
        <Printer size={14} /> Print / Save as PDF
      </button>

      <p className="text-muted text-xs text-center mt-3 print:hidden">Use your browser&apos;s print dialog to save as PDF.</p>
    </div>
  )
}

function VatReport({
  store,
  vat,
  fromIso,
  toIso,
}: {
  store: Store
  vat: { outputVat: number; inputVatEstimate: number; netDue: number }
  fromIso: string
  toIso: string
}) {
  return (
    <div className="print-area">
      <div className="hidden print:block mb-4 text-black">
        <p className="font-bold text-lg">{store.name}</p>
        {store.vatNumber && <p className="text-xs">VAT No: {store.vatNumber}</p>}
        {store.businessAddress && <p className="text-xs whitespace-pre-line">{store.businessAddress}</p>}
        <p className="text-xs mt-2">VAT Report · {fmtDate(fromIso)} → {fmtDate(toIso)}</p>
      </div>

      <div className="card p-5 mb-3">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest">Net VAT</p>
        <p className={`text-3xl font-bold mt-1 ${vat.netDue >= 0 ? 'text-orange-400' : 'text-brand'}`}>{fmtMoney(Math.abs(vat.netDue))}</p>
        <p className="text-muted text-sm mt-1">{vat.netDue >= 0 ? 'Owed to SARS' : 'Refundable from SARS'}</p>
      </div>

      <div className="card p-4 mb-3">
        <Row label={`Output VAT (collected on sales)`} value={fmtMoney(vat.outputVat)} />
        <Row label={`Input VAT (paid on supplies, est.)`} value={`-${fmtMoney(vat.inputVatEstimate)}`} muted />
        <RowBold label="Net VAT due" value={fmtMoney(vat.netDue)} valueColor={vat.netDue >= 0 ? '#F97316' : '#00C896'} />
      </div>

      <div className="card p-4 mb-4">
        <p className="text-muted text-xs leading-relaxed">
          <strong>Output VAT</strong> is the 15% you charged on sales (sum of <code>vat_amount</code> on sale records).
          <br /><br />
          <strong>Input VAT</strong> is estimated as 15/115 of restock costs, assuming your suppliers are VAT-registered (true for major distributors like Cash &amp; Carry, Massmart). Where suppliers don&apos;t charge VAT, the actual figure is lower.
          <br /><br />
          For a SARS-ready VAT201 submission, reconcile against your supplier invoices to get exact input VAT. This view is a working estimate.
        </p>
      </div>

      <button
        onClick={() => window.print()}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 print:hidden"
        style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}
      >
        <Printer size={14} /> Print / Save as PDF
      </button>
    </div>
  )
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${muted ? 'text-muted' : ''}`} style={muted ? {} : { color: 'var(--foreground)' }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: muted ? '#7B8CA1' : 'var(--foreground)' }}>{value}</span>
    </div>
  )
}

function RowBold({ label, value, hint, valueColor }: { label: string; value: string; hint?: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between py-2 mt-1" style={{ borderTop: '1px solid var(--card-border)' }}>
      <div>
        <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{label}</span>
        {hint && <span className="text-muted text-xs ml-2">{hint}</span>}
      </div>
      <span className="font-bold" style={{ color: valueColor ?? 'var(--foreground)' }}>{value}</span>
    </div>
  )
}
