'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type PurchaseOrder, type POStatus,
  orderTotal, receivedTotal, isOverdue,
} from '@/domain/entities/purchase-order'
import { type Supplier } from '@/domain/entities/supplier'
import { type ProductWithStatus } from '@/domain/entities/product'
import { ArrowLeft, Plus, Trash2, ClipboardList, Package } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import {
  createPoAction, receiveLineAction, cancelPoAction, archivePoAction,
} from './actions'

function fmtMoney(n: number) { return `R${n.toFixed(2)}` }
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtPo(n: number) { return `PO-${String(n).padStart(5, '0')}` }

function statusTone(s: POStatus): { bg: string; fg: string; label: string } {
  switch (s) {
    case 'draft':     return { bg: 'var(--surface)', fg: 'var(--muted)', label: 'Draft' }
    case 'sent':      return { bg: '#142136',        fg: '#60A5FA',      label: 'Sent' }
    case 'partial':   return { bg: '#3C2410',        fg: '#F59E0B',      label: 'Partial' }
    case 'received':  return { bg: '#143328',        fg: '#00C896',      label: 'Received' }
    case 'cancelled': return { bg: 'var(--surface)', fg: '#EF4444',      label: 'Cancelled' }
  }
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

interface LineDraft {
  productId: string
  description: string
  qtyOrdered: string
  unitCost: string
}
const EMPTY_LINE: LineDraft = { productId: '', description: '', qtyOrdered: '1', unitCost: '' }

export default function PurchaseOrdersClient({
  pos, suppliers, products,
}: {
  pos: PurchaseOrder[]
  suppliers: Supplier[]
  products: ProductWithStatus[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [openPoId, setOpenPoId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const openPo = pos.find(p => p.id === openPoId)

  function onCreate(input: {
    supplierId: string
    expectedAt: string
    notes: string
    lines: LineDraft[]
  }) {
    startTransition(async () => {
      const res = await createPoAction({
        supplierId: input.supplierId,
        expectedAt: input.expectedAt || undefined,
        notes: input.notes || undefined,
        lines: input.lines.map(l => ({
          productId: l.productId || undefined,
          description: l.description.trim(),
          qtyOrdered: parseFloat(l.qtyOrdered),
          unitCost: parseFloat(l.unitCost || '0'),
        })),
      })
      if (res.ok) {
        haptic(20)
        toast('PO created')
        setShowCreate(false)
        router.refresh()
      } else {
        toast(res.error ?? 'Failed to create PO')
      }
    })
  }

  function onReceive(po: PurchaseOrder, lineId: string, qty: number) {
    startTransition(async () => {
      const res = await receiveLineAction(po.id, lineId, qty)
      if (res.ok) { haptic(20); toast('Receipt logged'); router.refresh() }
      else toast(res.error ?? 'Failed')
    })
  }

  function onCancel(poId: string) {
    if (!confirm('Cancel this PO? It will no longer count as in-flight.')) return
    startTransition(async () => {
      const res = await cancelPoAction(poId)
      if (res.ok) { toast('PO cancelled'); router.refresh() }
      else toast(res.error ?? 'Failed')
    })
  }

  function onArchive(poId: string) {
    if (!confirm('Remove this PO from the list? Existing line history is kept.')) return
    startTransition(async () => {
      const res = await archivePoAction(poId)
      if (res.ok) { toast('PO removed'); setOpenPoId(null); router.refresh() }
      else toast(res.error ?? 'Failed')
    })
  }

  if (showCreate) {
    return (
      <PoForm
        suppliers={suppliers}
        products={products}
        onCancel={() => setShowCreate(false)}
        onSubmit={onCreate}
        isPending={isPending}
      />
    )
  }

  if (openPo) {
    return (
      <PoDetail
        po={openPo}
        onBack={() => setOpenPoId(null)}
        onReceive={onReceive}
        onCancel={() => onCancel(openPo.id)}
        onArchive={() => onArchive(openPo.id)}
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
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Purchase orders</h1>
        </div>
        <button
          onClick={() => {
            if (suppliers.length === 0) {
              toast('Add a supplier first under Suppliers.')
              return
            }
            setShowCreate(true)
          }}
          className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm w-auto"
        >
          <Plus size={14} /> New PO
        </button>
      </div>

      {pos.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          tone="blue"
          title="No purchase orders yet"
          description="Create a PO when you order stock from a supplier. Track expected delivery dates and mark line items as they arrive."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {pos.map((po) => {
            const tone = statusTone(po.status)
            const overdue = isOverdue(po)
            const total = orderTotal(po)
            return (
              <button
                key={po.id}
                onClick={() => setOpenPoId(po.id)}
                className="card p-4 text-left w-full active:opacity-80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                      {fmtPo(po.poNumber)} · {po.supplierName ?? 'Supplier'}
                    </p>
                    <p className="text-muted text-xs mt-0.5">
                      {po.lines.length} line{po.lines.length === 1 ? '' : 's'} · {fmtMoney(total)}
                      {po.expectedAt && ` · expected ${fmtDate(po.expectedAt)}`}
                    </p>
                    {overdue && (
                      <p className="text-[11px] font-semibold mt-1" style={{ color: '#EF4444' }}>OVERDUE</p>
                    )}
                  </div>
                  <span
                    className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: tone.bg, color: tone.fg }}
                  >
                    {tone.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

function PoDetail({
  po, onBack, onReceive, onCancel, onArchive, isPending,
}: {
  po: PurchaseOrder
  onBack: () => void
  onReceive: (po: PurchaseOrder, lineId: string, qty: number) => void
  onCancel: () => void
  onArchive: () => void
  isPending: boolean
}) {
  const tone = statusTone(po.status)
  const total = orderTotal(po)
  const received = receivedTotal(po)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <ArrowLeft size={18} color="#7B8CA1" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{fmtPo(po.poNumber)}</h1>
            <p className="text-muted text-xs">{po.supplierName} · expected {fmtDate(po.expectedAt)}</p>
          </div>
        </div>
        <span
          className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {tone.label}
        </span>
      </div>

      <div className="card p-5 mb-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-1">PO total</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{fmtMoney(total)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-1">Received</p>
            <p className="text-lg font-bold" style={{ color: '#00C896' }}>{fmtMoney(received)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        {po.lines.map((line) => (
          <ReceiveRow
            key={line.id}
            line={line}
            onReceive={(qty) => onReceive(po, line.id, qty)}
            disabled={po.status === 'cancelled' || isPending}
          />
        ))}
      </div>

      {po.notes && (
        <div className="card p-4 mb-3">
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Notes</p>
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>{po.notes}</p>
        </div>
      )}

      <div className="card p-4 mb-3">
        <p className="text-muted text-xs leading-relaxed">
          Receiving here marks <em>how much arrived</em>. To bump actual stock counts,
          run a <Link href="/inventory" className="underline">Restock</Link> against
          the matching product. Keeping these flows separate prevents double-counting
          and keeps your stock audit clean.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {po.status !== 'cancelled' && po.status !== 'received' && (
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl py-3 text-xs font-semibold"
            style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
          >
            Cancel PO
          </button>
        )}
        <button
          onClick={onArchive}
          disabled={isPending}
          className="rounded-xl py-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: '#EF4444' }}
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </>
  )
}

function ReceiveRow({
  line, onReceive, disabled,
}: {
  line: PurchaseOrder['lines'][number]
  onReceive: (qty: number) => void
  disabled: boolean
}) {
  const [qty, setQty] = useState(String(line.qtyReceived))
  const pct = line.qtyOrdered > 0 ? Math.min(100, (line.qtyReceived / line.qtyOrdered) * 100) : 0
  const tone = pct === 0 ? '#7B8CA1' : pct < 100 ? '#F59E0B' : '#00C896'

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {line.productName ?? line.description}
          </p>
          <p className="text-muted text-xs mt-0.5">
            {line.qtyOrdered} × {fmtMoney(line.unitCost)} = {fmtMoney(line.qtyOrdered * line.unitCost)}
          </p>
        </div>
        <span className="text-[11px] font-semibold" style={{ color: tone }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
        <input
          type="number"
          step="0.001"
          min="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          disabled={disabled}
          style={fieldStyle}
        />
        <button
          onClick={() => {
            const q = parseFloat(qty)
            if (Number.isFinite(q) && q >= 0) onReceive(q)
          }}
          disabled={disabled}
          className="btn-primary px-4 inline-flex items-center gap-1.5 w-auto"
        >
          <Package size={14} /> Receive
        </button>
      </div>
    </div>
  )
}

function PoForm({
  suppliers, products, onCancel, onSubmit, isPending,
}: {
  suppliers: Supplier[]
  products: ProductWithStatus[]
  onCancel: () => void
  onSubmit: (input: { supplierId: string; expectedAt: string; notes: string; lines: LineDraft[] }) => void
  isPending: boolean
}) {
  const today = new Date()
  const in7 = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10)

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [expectedAt, setExpectedAt] = useState(in7)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }])

  function updateLine(i: number, patch: Partial<LineDraft>) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function addLine() {
    setLines(prev => [...prev, { ...EMPTY_LINE }])
  }
  function removeLine(i: number) {
    setLines(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)
  }

  function pickProduct(i: number, productId: string) {
    const p = products.find(x => x.id === productId)
    updateLine(i, {
      productId,
      description: p?.name ?? '',
      unitCost: p?.cost ? String(p.cost) : '',
    })
  }

  const total = lines.reduce((sum, l) => {
    const q = parseFloat(l.qtyOrdered)
    const c = parseFloat(l.unitCost)
    return sum + (Number.isFinite(q) && Number.isFinite(c) ? q * c : 0)
  }, 0)

  const canSubmit = !!supplierId && lines.every(l => l.description.trim() && parseFloat(l.qtyOrdered) > 0)

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <ArrowLeft size={18} color="#7B8CA1" />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>New PO</h1>
      </div>

      <div className="card p-5 flex flex-col gap-3 mb-3">
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Supplier</p>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={fieldStyle}>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Expected delivery</p>
          <input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} style={fieldStyle} />
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        {lines.map((l, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted text-xs font-semibold uppercase tracking-widest">Line {i + 1}</p>
              {lines.length > 1 && (
                <button onClick={() => removeLine(i)} className="text-xs" style={{ color: '#EF4444' }}>Remove</button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <select value={l.productId} onChange={(e) => pickProduct(i, e.target.value)} style={fieldStyle}>
                <option value="">Free-text (no product link)</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Description" style={fieldStyle} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.001" min="0" value={l.qtyOrdered} onChange={(e) => updateLine(i, { qtyOrdered: e.target.value })} placeholder="Qty" style={fieldStyle} />
                <input type="number" step="0.01" min="0" value={l.unitCost} onChange={(e) => updateLine(i, { unitCost: e.target.value })} placeholder="Unit cost" style={fieldStyle} />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addLine} className="rounded-xl py-3 text-sm font-semibold inline-flex items-center justify-center gap-1.5" style={{ background: 'var(--surface)', border: '1px dashed var(--card-border)', color: 'var(--muted)' }}>
          <Plus size={14} /> Add another line
        </button>
      </div>

      <div className="card p-4 mb-3">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Notes (optional)</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} />
      </div>

      <div className="card p-4 mb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>PO total</p>
          <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{fmtMoney(total)}</p>
        </div>
      </div>

      <button
        onClick={() => onSubmit({ supplierId, expectedAt, notes, lines })}
        disabled={!canSubmit || isPending}
        className="btn-primary"
      >
        {isPending ? 'Creating…' : 'Create PO'}
      </button>
    </>
  )
}
