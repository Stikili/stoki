'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  SupplierBill,
  balanceOf,
  isOpen,
  isOverdue,
  daysOverdue,
  agingBucket,
  agingTotals,
} from '@/domain/entities/supplier-bill'
import { Supplier } from '@/domain/entities/supplier'
import { Store } from '@/domain/entities/store'
import { PAYMENT_METHODS } from '@/domain/entities/sale'
import { ArrowLeft, Plus, Trash2, CreditCard } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import {
  createBillAction,
  recordBillPaymentAction,
  archiveBillAction,
} from './actions'

function fmtMoney(n: number) { return `R${n.toFixed(2)}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

const BUCKET_META = [
  { key: 'current',     label: 'Current', tone: 'var(--muted)' },
  { key: 'days30',      label: '31-60d',  tone: '#F59E0B' },
  { key: 'days60',      label: '61-90d',  tone: '#F97316' },
  { key: 'days90Plus',  label: '90+',     tone: '#EF4444' },
] as const

export default function PayablesClient({
  store: _store,
  bills,
  suppliers,
}: {
  store: Store
  bills: SupplierBill[]
  suppliers: Supplier[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [openBillId, setOpenBillId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const now = new Date()
  const openBills = useMemo(() => bills.filter(isOpen), [bills])
  // `now` is recomputed every render so memoising buys nothing; compute inline.
  const totals = agingTotals(openBills, now)

  function onAdd(input: {
    supplierId: string
    reference: string
    issuedAt: string
    dueAt: string
    total: number
    notes: string
  }) {
    startTransition(async () => {
      const res = await createBillAction({
        supplierId: input.supplierId,
        reference: input.reference || undefined,
        issuedAt: input.issuedAt || undefined,
        dueAt: input.dueAt,
        total: input.total,
        notes: input.notes || undefined,
      })
      if (res.ok) {
        haptic(20)
        toast('Bill added')
        setShowCreate(false)
        router.refresh()
      } else {
        toast(res.error ?? 'Could not add bill')
      }
    })
  }

  function onPay(billId: string, amount: number, paymentMethod: string, notes: string) {
    startTransition(async () => {
      const res = await recordBillPaymentAction(billId, amount, paymentMethod, notes || undefined)
      if (res.ok) {
        haptic(20)
        toast('Payment recorded')
        setOpenBillId(null)
        router.refresh()
      } else {
        toast(res.error ?? 'Could not record payment')
      }
    })
  }

  function onArchive(billId: string) {
    if (!confirm('Remove this bill from the payables list? It will be archived (not deleted).')) return
    startTransition(async () => {
      const res = await archiveBillAction(billId)
      if (res.ok) {
        haptic(20)
        toast('Bill archived')
        setOpenBillId(null)
        router.refresh()
      } else {
        toast(res.error ?? 'Could not archive')
      }
    })
  }

  if (showCreate) {
    return (
      <BillForm
        suppliers={suppliers}
        onCancel={() => setShowCreate(false)}
        onSubmit={onAdd}
        isPending={isPending}
      />
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <ArrowLeft size={18} color="#7B8CA1" />
          </Link>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Payables</h1>
        </div>
        <button
          onClick={() => {
            if (suppliers.length === 0) {
              toast('Add a supplier first under Suppliers.')
              return
            }
            setShowCreate(true)
          }}
          className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm"
        >
          <Plus size={14} /> Add bill
        </button>
      </div>

      {/* Aging summary */}
      <div className="card p-5 mb-4">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-1">Total outstanding</p>
        <p className="text-[32px] font-bold leading-none" style={{ color: totals.days90Plus > 0 ? '#EF4444' : 'var(--foreground)' }}>
          {fmtMoney(totals.total)}
        </p>
        <p className="text-muted text-sm mt-1">
          {openBills.length} open bill{openBills.length === 1 ? '' : 's'}
        </p>
        {totals.total > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {BUCKET_META.map((b) => {
              const amt = totals[b.key]
              const count = totals.countByBucket[b.key]
              return (
                <div key={b.key} className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: b.tone }}>{b.label}</p>
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--foreground)' }}>{fmtMoney(amt)}</p>
                  <p className="text-muted text-[10px] mt-0.5">{count}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Open bills list */}
      {openBills.length === 0 ? (
        <EmptyState
          icon={<CreditCard />}
          tone="amber"
          title="No bills outstanding"
          description="When suppliers send you bills on credit, add them here to track due dates and aging."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {openBills.map((bill) => {
            const bal = balanceOf(bill)
            const overdue = isOverdue(bill, now)
            const days = daysOverdue(bill, now)
            const bucket = agingBucket(bill, now)
            const isExpanded = openBillId === bill.id
            const tone = bucket === 'days90Plus' ? '#EF4444'
                       : bucket === 'days60'     ? '#F97316'
                       : bucket === 'days30'     ? '#F59E0B'
                       : 'var(--muted)'
            return (
              <div key={bill.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenBillId(isExpanded ? null : bill.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                        {bill.supplierName ?? 'Supplier'}
                      </p>
                      <p className="text-muted text-xs mt-0.5 truncate">
                        {bill.reference ? `${bill.reference} · ` : ''}Due {fmtDate(bill.dueAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: 'var(--foreground)' }}>{fmtMoney(bal)}</p>
                      {overdue ? (
                        <p className="text-[11px] font-semibold mt-0.5" style={{ color: tone }}>
                          {days}d overdue
                        </p>
                      ) : (
                        <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--muted-dim)' }}>
                          {days < 0 ? `in ${Math.abs(days)}d` : 'due today'}
                        </p>
                      )}
                    </div>
                  </div>
                  {bill.amountPaid > 0 && (
                    <p className="text-muted text-xs mt-2">
                      Paid {fmtMoney(bill.amountPaid)} of {fmtMoney(bill.total)}
                    </p>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--card-border)' }}>
                    <PaymentSheet
                      maxAmount={bal}
                      onSubmit={(amount, method, notes) => onPay(bill.id, amount, method, notes)}
                      onArchive={() => onArchive(bill.id)}
                      isPending={isPending}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

const fieldStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '14px 16px',
  color: 'var(--foreground)',
  fontSize: '16px',
  outline: 'none',
  width: '100%',
} as const

function BillForm({
  suppliers,
  onCancel,
  onSubmit,
  isPending,
}: {
  suppliers: Supplier[]
  onCancel: () => void
  onSubmit: (input: {
    supplierId: string
    reference: string
    issuedAt: string
    dueAt: string
    total: number
    notes: string
  }) => void
  isPending: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [reference, setReference] = useState('')
  const [issuedAt, setIssuedAt] = useState(today)
  const [dueAt, setDueAt] = useState(in30)
  const [total, setTotal] = useState('')
  const [notes, setNotes] = useState('')

  const totalNum = parseFloat(total)
  const canSubmit = !!supplierId && !!dueAt && Number.isFinite(totalNum) && totalNum > 0

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <ArrowLeft size={18} color="#7B8CA1" />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Add bill</h1>
      </div>

      <div className="card p-5 flex flex-col gap-3">
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Supplier</p>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={fieldStyle}>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Reference (optional)</p>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Supplier's invoice number"
            style={fieldStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Issued</p>
            <input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Due</p>
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={fieldStyle} />
          </div>
        </div>

        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Total (R)</p>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0.00"
            style={fieldStyle}
          />
        </div>

        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Notes (optional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </div>

        <button
          onClick={() => onSubmit({
            supplierId,
            reference,
            issuedAt: issuedAt ? new Date(issuedAt).toISOString() : '',
            dueAt: dueAt ? new Date(dueAt).toISOString() : '',
            total: totalNum,
            notes,
          })}
          disabled={!canSubmit || isPending}
          className="btn-primary mt-1"
        >
          {isPending ? 'Saving…' : 'Add bill'}
        </button>
      </div>
    </>
  )
}

function PaymentSheet({
  maxAmount,
  onSubmit,
  onArchive,
  isPending,
}: {
  maxAmount: number
  onSubmit: (amount: number, paymentMethod: string, notes: string) => void
  onArchive: () => void
  isPending: boolean
}) {
  const [amount, setAmount] = useState(maxAmount.toFixed(2))
  const [paymentMethod, setPaymentMethod] = useState('eft')
  const [notes, setNotes] = useState('')

  const amt = parseFloat(amount)
  const canSubmit = Number.isFinite(amt) && amt > 0 && amt <= maxAmount + 0.001

  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Amount</p>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max={maxAmount.toFixed(2)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Method</p>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={fieldStyle}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        style={fieldStyle}
      />

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={() => onSubmit(amt, paymentMethod, notes)}
          disabled={!canSubmit || isPending}
          className="btn-primary"
        >
          {isPending ? 'Saving…' : `Record ${amt > 0 ? fmtMoney(amt) : 'payment'}`}
        </button>
        <button
          onClick={onArchive}
          disabled={isPending}
          className="rounded-xl px-3 py-3 inline-flex items-center justify-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: '#EF4444' }}
          aria-label="Archive bill"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
