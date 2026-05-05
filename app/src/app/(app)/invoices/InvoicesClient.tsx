'use client'

import { useMemo, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { Customer } from '@/domain/entities/customer'
import {
  Invoice,
  InvoiceStatus,
  INVOICE_STATUSES,
  balanceOf,
  isOverdue,
  daysOverdue,
} from '@/domain/entities/invoice'
import { Store } from '@/domain/entities/store'
import { ProductWithStatus } from '@/domain/entities/product'
import { PAYMENT_METHODS } from '@/domain/entities/sale'
import { computeVat } from '@/lib/vat'
import {
  createInvoiceAction,
  recordInvoicePaymentAction,
  updateInvoiceStatusAction,
  archiveInvoiceAction,
  duplicateInvoiceAction,
} from './actions'
import { addCustomerAction } from '../customers/actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import { Plus, Printer, Trash2, Mail, MessageCircle, Receipt as ReceiptIcon } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import Swipeable from '@/components/Swipeable'
import { buildMailtoUrl, buildWhatsAppUrl } from '@/lib/invoice-delivery'

type FilterState = 'all' | InvoiceStatus

function fmtMoney(n: number) { return `R${n.toFixed(2)}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtInvoiceNo(n: number) { return `INV-${String(n).padStart(5, '0')}` }

interface LineDraft {
  description: string
  qty: string
  unitPrice: string
  vatInclusive: boolean
}

const EMPTY_LINE: LineDraft = { description: '', qty: '1', unitPrice: '', vatInclusive: true }

export default function InvoicesClient({
  store,
  customers,
  invoices,
  products,
}: {
  store: Store
  customers: Customer[]
  invoices: Invoice[]
  products: ProductWithStatus[]
}) {
  const { toast } = useToast()
  const sp = useSearchParams()
  // Deep-link from the command palette: `/invoices?new=1` opens the create
  // sheet immediately. Computed during render (not via effect) so the sheet
  // mounts on first paint instead of after a re-render.
  const [filter, setFilter] = useState<FilterState>('all')
  const [showCreate, setShowCreate] = useState(() => sp.get('new') === '1')
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const openInvoice = invoices.find(i => i.id === openInvoiceId)

  const filtered = useMemo(() => {
    if (filter === 'all') return invoices
    return invoices.filter(i => i.status === filter)
  }, [invoices, filter])

  // Aged receivables: only outstanding (status != paid/cancelled), grouped by overdue days.
  const aging = useMemo(() => {
    const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 }
    for (const inv of invoices) {
      if (inv.status === 'paid' || inv.status === 'cancelled') continue
      const bal = balanceOf(inv)
      if (bal <= 0) continue
      const overdue = daysOverdue(inv)
      if (overdue < 0) buckets.current += bal
      else if (overdue <= 30) buckets.d1_30 += bal
      else if (overdue <= 60) buckets.d31_60 += bal
      else if (overdue <= 90) buckets.d61_90 += bal
      else buckets.d90plus += bal
    }
    return buckets
  }, [invoices])

  const totalOutstanding = aging.current + aging.d1_30 + aging.d31_60 + aging.d61_90 + aging.d90plus

  function handleStatusUpdate(id: string, status: InvoiceStatus) {
    startTransition(async () => {
      await updateInvoiceStatusAction(id, status)
      toast(`Marked as ${status}`)
    })
  }

  function handleArchive(id: string) {
    if (!confirm('Archive this invoice?')) return
    startTransition(async () => {
      await archiveInvoiceAction(id)
      setOpenInvoiceId(null)
      toast('Archived', 'info')
    })
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateInvoiceAction(id)
      if (result.ok && result.invoiceId) {
        haptic(30)
        setOpenInvoiceId(result.invoiceId)
        toast('Duplicated as draft')
      } else {
        toast(result.error ?? 'Could not duplicate', 'error')
      }
    })
  }

  function handleRecordPayment(invoiceId: string, fd: FormData) {
    const amount = parseFloat((fd.get('amount') as string) ?? '0')
    const method = (fd.get('method') as string) ?? 'eft'
    const notes = (fd.get('notes') as string) ?? ''
    if (!Number.isFinite(amount) || amount <= 0) return toast('Enter an amount', 'error')
    startTransition(async () => {
      const result = await recordInvoicePaymentAction(invoiceId, amount, method, notes || undefined)
      if (result.ok) {
        haptic(50)
        toast(`Payment recorded — ${fmtMoney(amount)}`)
      } else {
        toast(result.error ?? 'Failed', 'error')
      }
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Invoices</h1>
        <button onClick={() => setShowCreate(true)} disabled={customers.length === 0} className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#00C896', opacity: customers.length === 0 ? 0.4 : 1 }}>
          <Plus size={20} color="white" strokeWidth={2.5} />
        </button>
      </div>

      {customers.length === 0 && (
        <div className="card p-4 mb-4 print:hidden" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>Add a B2B customer first.</p>
          <a href="/customers" className="text-brand text-xs font-semibold mt-1 inline-block">Manage customers →</a>
        </div>
      )}

      {/* Aged receivables */}
      <div className="card p-5 mb-3 print:hidden">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Total outstanding</p>
        <p className={`text-3xl font-bold ${totalOutstanding > 0 ? 'text-danger' : 'text-brand'}`}>{fmtMoney(totalOutstanding)}</p>
      </div>

      {totalOutstanding > 0 && (
        <div className="card p-4 mb-4 print:hidden">
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">Aging</p>
          <div className="grid grid-cols-5 gap-2 text-center">
            <Bucket label="Current" amount={aging.current} colour="var(--foreground)" />
            <Bucket label="1-30" amount={aging.d1_30} colour="#F59E0B" />
            <Bucket label="31-60" amount={aging.d31_60} colour="#F97316" />
            <Bucket label="61-90" amount={aging.d61_90} colour="#EF4444" />
            <Bucket label="90+" amount={aging.d90plus} colour="#EF4444" />
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 print:hidden">
        {(['all', 'draft', 'sent', 'paid', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as FilterState)}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
            style={filter === f
              ? { background: '#00C896', color: '#0A0E17' }
              : { background: 'var(--card-bg)', color: 'var(--muted)', border: '1px solid var(--card-border)' }}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        invoices.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon />}
            tone="blue"
            title="No invoices yet"
            description={customers.length === 0
              ? 'Add a customer first, then issue your first invoice with VAT and payment terms.'
              : 'Issue your first invoice to a customer — the number is auto-claimed and SARS-sequential.'}
            ctaLabel={customers.length === 0 ? 'Add a customer' : undefined}
            ctaHref={customers.length === 0 ? '/customers' : undefined}
            pointToAction={customers.length > 0}
          />
        ) : (
          <p className="text-center text-muted py-12">No invoices in this view</p>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(inv => {
            const overdue = isOverdue(inv)
            const balance = balanceOf(inv)
            const customer = customers.find(c => c.id === inv.customerId) ?? null
            const waUrl = balance > 0 ? buildWhatsAppUrl(store, inv, customer) : ''
            return (
              <Swipeable
                key={inv.id}
                rightAction={waUrl ? {
                  icon: <MessageCircle size={18} strokeWidth={2} />,
                  label: 'Chase via WhatsApp',
                  color: '#25D366',
                  href: waUrl,
                } : undefined}
              >
              <button onClick={() => setOpenInvoiceId(inv.id)} className="card p-4 text-left w-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{fmtInvoiceNo(inv.invoiceNumber)}</p>
                      <StatusPill status={inv.status} />
                      {overdue && <span className="pill pill-red text-[10px] py-0">Overdue {daysOverdue(inv)}d</span>}
                    </div>
                    <p className="text-muted text-xs mt-1 truncate">{inv.customerName ?? 'Unknown customer'}</p>
                    <p className="text-muted text-[11px] mt-0.5">Issued {fmtDate(inv.issuedAt)} · Due {fmtDate(inv.dueAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold" style={{ color: 'var(--foreground)' }}>{fmtMoney(inv.total)}</p>
                    {balance > 0 && balance !== inv.total && (
                      <p className="text-danger text-xs mt-0.5">{fmtMoney(balance)} due</p>
                    )}
                    {balance === 0 && inv.status === 'paid' && (
                      <p className="text-brand text-xs mt-0.5">Paid</p>
                    )}
                  </div>
                </div>
              </button>
              </Swipeable>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateInvoiceSheet
          store={store}
          customers={customers}
          products={products}
          onClose={() => setShowCreate(false)}
          onSuccess={(invoiceId) => {
            setShowCreate(false)
            setOpenInvoiceId(invoiceId)
            toast('Invoice created')
          }}
        />
      )}

      {openInvoice && (
        <InvoiceDetailSheet
          store={store}
          invoice={openInvoice}
          customer={customers.find((c) => c.id === openInvoice.customerId) ?? null}
          isPending={isPending}
          onClose={() => setOpenInvoiceId(null)}
          onStatusUpdate={(s) => handleStatusUpdate(openInvoice.id, s)}
          onArchive={() => handleArchive(openInvoice.id)}
          onDuplicate={() => handleDuplicate(openInvoice.id)}
          onRecordPayment={(fd) => handleRecordPayment(openInvoice.id, fd)}
        />
      )}
    </>
  )
}

function Bucket({ label, amount, colour }: { label: string; amount: number; colour: string }) {
  return (
    <div>
      <p className="text-muted text-[10px] uppercase">{label}</p>
      <p className="text-xs font-bold mt-0.5" style={{ color: amount > 0 ? colour : 'var(--muted)' }}>
        {amount > 0 ? `R${amount.toFixed(0)}` : '—'}
      </p>
    </div>
  )
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, string> = {
    draft: 'pill-yellow',
    sent: 'pill-blue',
    paid: 'pill-green',
    cancelled: 'pill-red',
  }
  return <span className={`pill ${map[status]} text-[10px] py-0`}>{INVOICE_STATUSES.find(s => s.value === status)?.label}</span>
}

function CreateInvoiceSheet({
  store,
  customers,
  products,
  onClose,
  onSuccess,
}: {
  store: Store
  customers: Customer[]
  products: ProductWithStatus[]
  onClose: () => void
  onSuccess: (invoiceId: string) => void
}) {
  const { toast } = useToast()
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [dueDays, setDueDays] = useState<string>(String(customers[0]?.paymentTermsDays ?? 30))
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }])
  const [notes, setNotes] = useState('')
  const [sendImmediately, setSendImmediately] = useState(true)
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(customers.length === 0)
  const [isPending, startTransition] = useTransition()

  function setLine(idx: number, patch: Partial<LineDraft>) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  function fillFromProduct(idx: number, productId: string) {
    const p = products.find(p => p.id === productId)
    if (!p) return
    setLine(idx, {
      description: p.name,
      unitPrice: String(p.price.toFixed(2)),
      vatInclusive: p.vatInclusive ?? true,
    })
  }

  // Live totals as user fills in lines.
  const totals = useMemo(() => {
    let subtotalExcl = 0, vat = 0, total = 0
    for (const l of lines) {
      const qty = parseFloat(l.qty) || 0
      const unitPrice = parseFloat(l.unitPrice) || 0
      if (qty <= 0 || unitPrice <= 0 || !l.description.trim()) continue
      const breakdown = computeVat(unitPrice, qty, store.vatRegistered, l.vatInclusive, store.vatRate)
      subtotalExcl += breakdown.exclusive
      vat += breakdown.vat
      total += breakdown.inclusive
    }
    return { subtotalExcl, vat, total }
  }, [lines, store.vatRegistered, store.vatRate])

  function submit() {
    if (!customerId) return toast('Pick a customer', 'error')
    const validLines = lines
      .filter(l => l.description.trim() && parseFloat(l.qty) > 0 && parseFloat(l.unitPrice) >= 0)
      .map(l => ({
        description: l.description.trim(),
        qty: parseFloat(l.qty),
        unitPrice: parseFloat(l.unitPrice),
        vatInclusive: l.vatInclusive,
      }))
    if (validLines.length === 0) return toast('Add at least one line item', 'error')

    startTransition(async () => {
      const result = await createInvoiceAction({
        customerId,
        dueDays: parseInt(dueDays) || undefined,
        status: sendImmediately ? 'sent' : 'draft',
        notes: notes.trim() || undefined,
        lines: validLines,
      })
      if (result.ok && result.invoiceId) {
        haptic(50)
        onSuccess(result.invoiceId)
      } else {
        toast(result.error ?? 'Failed', 'error')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative rounded-t-3xl p-6 pb-24 sheet max-h-[88vh] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6 sticky top-0" />
        <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--foreground)' }}>New Invoice</h2>

        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-muted text-xs ml-1 block">Customer *</label>
              <button
                type="button"
                onClick={() => setShowQuickAddCustomer(true)}
                className="text-brand text-xs font-semibold"
              >
                + New customer
              </button>
            </div>
            <select value={customerId} onChange={e => {
              const next = e.target.value
              setCustomerId(next)
              const c = customers.find(c => c.id === next)
              if (c) setDueDays(String(c.paymentTermsDays))
            }} className="input">
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-muted text-xs ml-1 mb-1 block">Due in (days)</label>
            <input type="number" min={0} max={180} value={dueDays} onChange={e => setDueDays(e.target.value)} className="input" />
          </div>

          {/* Line items */}
          <div className="mt-2">
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Line items</p>
            <div className="flex flex-col gap-3">
              {lines.map((l, idx) => (
                <div key={idx} className="card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {products.length > 0 && (
                      <select onChange={e => e.target.value && fillFromProduct(idx, e.target.value)} value="" className="input flex-1 text-xs" style={{ padding: '8px 12px' }}>
                        <option value="">— Pick from inventory —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (R{p.price.toFixed(2)})</option>)}
                      </select>
                    )}
                    {lines.length > 1 && (
                      <button onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
                        <Trash2 size={12} color="#EF4444" />
                      </button>
                    )}
                  </div>
                  <input value={l.description} onChange={e => setLine(idx, { description: e.target.value })} placeholder="Description *" className="input mb-2" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-muted text-[11px] ml-1">Qty</label>
                      <input type="number" min="0" step="1" value={l.qty} onChange={e => setLine(idx, { qty: e.target.value })} className="input" />
                    </div>
                    <div>
                      <label className="text-muted text-[11px] ml-1">Unit price (R)</label>
                      <input type="number" min="0" step="0.01" value={l.unitPrice} onChange={e => setLine(idx, { unitPrice: e.target.value })} className="input" />
                    </div>
                  </div>
                  {store.vatRegistered && (
                    <label className="flex items-center justify-between mt-2 px-2 py-1.5 rounded-lg cursor-pointer">
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>Price includes VAT</span>
                      <input type="checkbox" checked={l.vatInclusive} onChange={e => setLine(idx, { vatInclusive: e.target.checked })} className="w-4 h-4 accent-brand" />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setLines(prev => [...prev, { ...EMPTY_LINE }])}
              className="text-brand text-sm font-semibold mt-3"
            >
              + Add another line
            </button>
          </div>

          {/* Live totals */}
          {totals.total > 0 && (
            <div className="card p-3 mt-2">
              {store.vatRegistered && (
                <>
                  <div className="flex justify-between text-xs text-muted py-0.5">
                    <span>Subtotal (excl. VAT)</span>
                    <span>{fmtMoney(totals.subtotalExcl)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted py-0.5">
                    <span>VAT @ {store.vatRate}%</span>
                    <span>{fmtMoney(totals.vat)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                <span>Total</span>
                <span>{fmtMoney(totals.total)}</span>
              </div>
            </div>
          )}

          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="input" />

          <label className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
            <span className="text-sm" style={{ color: 'var(--foreground)' }}>Mark as sent immediately</span>
            <input type="checkbox" checked={sendImmediately} onChange={e => setSendImmediately(e.target.checked)} className="w-5 h-5 accent-brand" />
          </label>

          <button onClick={submit} disabled={isPending} className="btn-primary mt-2">
            {isPending ? 'Creating…' : `Create Invoice · ${fmtMoney(totals.total)}`}
          </button>
        </div>

        {showQuickAddCustomer && (
          <QuickAddCustomerSheet
            onClose={() => setShowQuickAddCustomer(false)}
            onCreated={(id, defaultTermsDays) => {
              setShowQuickAddCustomer(false)
              setCustomerId(id)
              setDueDays(String(defaultTermsDays))
            }}
          />
        )}
      </div>
    </div>
  )
}

function QuickAddCustomerSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string, paymentTermsDays: number) => void
}) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  function submit(fd: FormData) {
    startTransition(async () => {
      const result = await addCustomerAction(fd)
      if (result.ok && result.id) {
        const terms = parseInt((fd.get('paymentTermsDays') as string) ?? '30') || 30
        onCreated(result.id, terms)
        toast('Customer added')
      } else {
        toast(result.error ?? 'Could not add customer', 'error')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative rounded-t-3xl p-6 pb-24 sheet">
        <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Quick add customer</h2>
        <p className="text-muted text-sm mb-5">Add the basics now — fill in VAT number / address later from /customers.</p>
        <form action={submit} className="flex flex-col gap-3">
          <input name="name" placeholder="Business name *" required autoFocus className="input" />
          <div className="grid grid-cols-2 gap-3">
            <input name="contactName" placeholder="Contact" className="input" />
            <input name="phone" type="tel" placeholder="Phone" className="input" />
          </div>
          <input name="email" type="email" placeholder="Email (for invoice delivery)" className="input" />
          <div>
            <label className="text-muted text-xs ml-1 mb-1 block">Payment terms (days)</label>
            <input name="paymentTermsDays" type="number" defaultValue={30} min={0} max={180} className="input" />
          </div>
          <button type="submit" disabled={isPending} className="btn-primary mt-2">
            {isPending ? 'Saving…' : 'Add Customer'}
          </button>
        </form>
      </div>
    </div>
  )
}

function InvoiceDetailSheet({
  store,
  invoice,
  customer,
  isPending,
  onClose,
  onStatusUpdate,
  onArchive,
  onDuplicate,
  onRecordPayment,
}: {
  store: Store
  invoice: Invoice
  customer: Customer | null
  isPending: boolean
  onClose: () => void
  onStatusUpdate: (s: InvoiceStatus) => void
  onArchive: () => void
  onDuplicate: () => void
  onRecordPayment: (fd: FormData) => void
}) {
  const balance = balanceOf(invoice)
  const overdue = isOverdue(invoice)
  const mailtoUrl = buildMailtoUrl(store, invoice, customer)
  const whatsappUrl = buildWhatsAppUrl(store, invoice, customer)

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70 print:hidden" onClick={onClose} />
      <div className="relative rounded-t-3xl p-6 pb-24 sheet max-h-[92vh] overflow-y-auto print:p-0 print:rounded-none print:max-h-none print:bg-white">
        <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6 print:hidden" />

        {/* Print-only header */}
        <div className="hidden print:block mb-4 text-black">
          <p className="font-bold text-xl">{store.name}</p>
          {store.businessAddress && <p className="text-xs whitespace-pre-line">{store.businessAddress}</p>}
          {store.phone && <p className="text-xs">Tel: {store.phone}</p>}
          {store.vatRegistered && store.vatNumber && <p className="text-xs">VAT No: {store.vatNumber}</p>}
        </div>

        <div className="flex items-start justify-between mb-1 print:items-end">
          <h2 className="text-xl font-bold print:text-2xl" style={{ color: 'var(--foreground)' }}>
            {store.vatRegistered ? 'TAX INVOICE' : 'INVOICE'}
          </h2>
          <div className="flex items-center gap-1.5 print:hidden">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-white"
                style={{ background: '#25D366' }}
              >
                <MessageCircle size={12} /> WhatsApp
              </a>
            )}
            {mailtoUrl && (
              <a
                href={mailtoUrl}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}
              >
                <Mail size={12} /> Email
              </a>
            )}
            <button onClick={() => window.print()} className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}>
              <Printer size={12} /> Print
            </button>
          </div>
        </div>
        <p className="text-muted text-sm mb-4 print:text-black">{`INV-${String(invoice.invoiceNumber).padStart(5, '0')}`}</p>

        <div className="card p-4 mb-3 print:bg-white print:border print:border-gray-300">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted text-[11px] uppercase">Customer</p>
              <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{invoice.customerName ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted text-[11px] uppercase">Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StatusPill status={invoice.status} />
                {overdue && <span className="pill pill-red text-[10px] py-0">Overdue</span>}
              </div>
            </div>
            <div>
              <p className="text-muted text-[11px] uppercase">Issued</p>
              <p style={{ color: 'var(--foreground)' }}>{fmtDate(invoice.issuedAt)}</p>
            </div>
            <div>
              <p className="text-muted text-[11px] uppercase">Due</p>
              <p style={{ color: 'var(--foreground)' }}>{fmtDate(invoice.dueAt)}</p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="card p-3 mb-3 print:bg-white print:border print:border-gray-300">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted">
                <th className="text-left p-2 font-semibold">Description</th>
                <th className="text-right p-2 font-semibold">Qty</th>
                <th className="text-right p-2 font-semibold">Unit</th>
                <th className="text-right p-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((l, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--card-border)' }}>
                  <td className="p-2" style={{ color: 'var(--foreground)' }}>{l.description}</td>
                  <td className="p-2 text-right" style={{ color: 'var(--foreground)' }}>{l.qty}</td>
                  <td className="p-2 text-right" style={{ color: 'var(--foreground)' }}>{fmtMoney(l.unitPrice)}</td>
                  <td className="p-2 text-right font-semibold" style={{ color: 'var(--foreground)' }}>{fmtMoney(l.unitPrice * l.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="card p-4 mb-3 print:bg-white print:border print:border-gray-300">
          {store.vatRegistered && (
            <>
              <div className="flex justify-between text-sm py-0.5">
                <span className="text-muted">Subtotal (excl. VAT)</span>
                <span style={{ color: 'var(--foreground)' }}>{fmtMoney(invoice.subtotalExcl)}</span>
              </div>
              <div className="flex justify-between text-sm py-0.5">
                <span className="text-muted">VAT @ {store.vatRate}%</span>
                <span style={{ color: 'var(--foreground)' }}>{fmtMoney(invoice.vatAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-lg pt-2" style={{ borderTop: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
            <span>Total</span>
            <span>{fmtMoney(invoice.total)}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <>
              <div className="flex justify-between text-sm pt-2 mt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
                <span className="text-muted">Paid</span>
                <span className="text-brand">{fmtMoney(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1">
                <span style={{ color: 'var(--foreground)' }}>Balance</span>
                <span className={balance > 0 ? 'text-danger' : 'text-brand'}>{fmtMoney(balance)}</span>
              </div>
            </>
          )}
        </div>

        {invoice.notes && (
          <div className="card p-3 mb-3 print:bg-white print:border print:border-gray-300">
            <p className="text-muted text-xs uppercase tracking-widest mb-1">Notes</p>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{invoice.notes}</p>
          </div>
        )}

        {/* Status actions */}
        <div className="flex gap-2 mb-3 print:hidden">
          {invoice.status === 'draft' && (
            <button onClick={() => onStatusUpdate('sent')} disabled={isPending} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}>
              Mark as Sent
            </button>
          )}
          <button onClick={onDuplicate} disabled={isPending} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}>
            Duplicate
          </button>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button onClick={() => onStatusUpdate('cancelled')} disabled={isPending} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              Cancel
            </button>
          )}
          <button onClick={onArchive} disabled={isPending} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--card-border)' }}>
            Archive
          </button>
        </div>

        {/* Record payment */}
        {balance > 0 && invoice.status !== 'cancelled' && (
          <div className="card p-4 mb-3 print:hidden">
            <p className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Record payment</p>
            <form action={onRecordPayment} className="flex flex-col gap-3">
              <input name="amount" type="number" step="0.01" min="0.01" max={balance} defaultValue={balance.toFixed(2)} required className="input" />
              <select name="method" defaultValue="eft" className="input">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <input name="notes" placeholder="Reference (optional)" className="input" />
              <button type="submit" disabled={isPending} className="btn-primary">{isPending ? 'Recording…' : 'Record Payment'}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
