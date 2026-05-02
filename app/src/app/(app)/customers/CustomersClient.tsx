'use client'

import { useState, useTransition } from 'react'
import { Customer } from '@/domain/entities/customer'
import { addCustomerAction, editCustomerAction, archiveCustomerAction, restoreCustomerAction } from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import { Plus } from 'lucide-react'

interface CustomerStats { outstanding: number; lastInvoice: string | null; count: number }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomersClient({
  customers,
  archived = [],
  stats,
}: {
  customers: Customer[]
  archived?: Customer[]
  stats: Record<string, CustomerStats>
}) {
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [isPending, startTransition] = useTransition()

  const editing = customers.find(c => c.id === editId)
  const totalOutstanding = Object.values(stats).reduce((s, c) => s + c.outstanding, 0)

  function handleRestore(id: string, name: string) {
    startTransition(async () => {
      await restoreCustomerAction(id)
      toast(`Restored ${name}`)
    })
  }

  function handleAdd(fd: FormData) {
    startTransition(async () => {
      await addCustomerAction(fd)
      setShowAdd(false)
      haptic(30)
      toast('Customer added')
    })
  }

  function handleEdit(fd: FormData) {
    startTransition(async () => {
      await editCustomerAction(fd)
      setEditId(null)
      toast('Customer updated')
    })
  }

  function handleArchive(id: string, name: string) {
    if (!confirm(`Archive ${name}? Existing invoices stay intact.`)) return
    haptic(50)
    startTransition(async () => {
      await archiveCustomerAction(id)
      setEditId(null)
      toast('Customer archived', 'info')
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Customers</h1>
        <button onClick={() => setShowAdd(true)} className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#00C896' }}>
          <Plus size={20} color="white" strokeWidth={2.5} />
        </button>
      </div>

      <div className="card p-5 mb-4">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Total outstanding</p>
        <p className={`text-3xl font-bold ${totalOutstanding > 0 ? 'text-danger' : 'text-brand'}`}>R{totalOutstanding.toFixed(2)}</p>
        <p className="text-muted text-sm mt-1">{customers.length} customer{customers.length === 1 ? '' : 's'}</p>
      </div>

      {customers.length === 0 ? (
        <p className="text-center text-muted py-12">No customers yet — tap + to add a B2B account.<br/>Use them when issuing formal invoices with payment terms.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {customers.map(c => {
            const s = stats[c.id]
            return (
              <button key={c.id} onClick={() => setEditId(c.id)} className="card p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>{c.name}</p>
                    {c.contactName && <p className="text-muted text-xs mt-0.5">{c.contactName}</p>}
                    <div className="flex items-center gap-3 text-muted text-[11px] mt-1.5">
                      {c.vatNumber && <span>VAT {c.vatNumber}</span>}
                      <span>Net {c.paymentTermsDays}d</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {s && s.outstanding > 0 ? (
                      <>
                        <p className="text-danger font-bold text-sm">R{s.outstanding.toFixed(2)}</p>
                        <p className="text-muted text-[10px]">{s.count} invoice{s.count === 1 ? '' : 's'}</p>
                      </>
                    ) : s && s.count > 0 ? (
                      <>
                        <p className="text-brand font-bold text-sm">Paid up</p>
                        <p className="text-muted text-[10px]">{s.count} invoice{s.count === 1 ? '' : 's'}</p>
                      </>
                    ) : (
                      <p className="text-muted text-[11px]">No invoices yet</p>
                    )}
                    {s?.lastInvoice && <p className="text-muted text-[10px] mt-0.5">last {fmtDate(s.lastInvoice)}</p>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Archived — collapsible. Only renders the toggle when there's something to restore. */}
      {archived.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchived(s => !s)}
            className="text-muted text-xs font-semibold"
          >
            {showArchived ? '▾' : '▸'} Archived ({archived.length})
          </button>
          {showArchived && (
            <div className="flex flex-col gap-2 mt-3">
              {archived.map(c => (
                <div key={c.id} className="card p-3 flex items-center justify-between gap-3" style={{ opacity: 0.7 }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>{c.name}</p>
                    <p className="text-muted text-xs">archived</p>
                  </div>
                  <button
                    onClick={() => handleRestore(c.id, c.name)}
                    disabled={isPending}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--pill-green-bg)', color: '#00C896' }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAdd(false)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--foreground)' }}>New B2B Customer</h2>
            <form action={handleAdd} className="flex flex-col gap-3">
              <input name="name" placeholder="Business name *" required autoFocus className="input" />
              <div className="grid grid-cols-2 gap-3">
                <input name="contactName" placeholder="Contact person" className="input" />
                <input name="phone" type="tel" placeholder="Phone" className="input" />
              </div>
              <input name="email" type="email" placeholder="Email (for invoices)" className="input" />
              <input name="vatNumber" placeholder="VAT number" className="input" />
              <textarea name="billingAddress" placeholder="Billing address" rows={2} className="input" />
              <div>
                <label className="text-muted text-xs ml-1 mb-1 block">Payment terms (days)</label>
                <input name="paymentTermsDays" type="number" defaultValue={30} min={0} max={180} className="input" />
              </div>
              <textarea name="notes" placeholder="Notes" rows={2} className="input" />
              <button type="submit" disabled={isPending} className="btn-primary mt-2">{isPending ? 'Saving…' : 'Add Customer'}</button>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Edit Customer</h2>
              <button onClick={() => handleArchive(editing.id, editing.name)} disabled={isPending} className="pill pill-red min-h-0 text-xs">Archive</button>
            </div>
            <form action={handleEdit} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={editing.id} />
              <input name="name" defaultValue={editing.name} required className="input" />
              <div className="grid grid-cols-2 gap-3">
                <input name="contactName" defaultValue={editing.contactName ?? ''} placeholder="Contact" className="input" />
                <input name="phone" type="tel" defaultValue={editing.phone ?? ''} placeholder="Phone" className="input" />
              </div>
              <input name="email" type="email" defaultValue={editing.email ?? ''} placeholder="Email" className="input" />
              <input name="vatNumber" defaultValue={editing.vatNumber ?? ''} placeholder="VAT number" className="input" />
              <textarea name="billingAddress" defaultValue={editing.billingAddress ?? ''} placeholder="Billing address" rows={2} className="input" />
              <div>
                <label className="text-muted text-xs ml-1 mb-1 block">Payment terms (days)</label>
                <input name="paymentTermsDays" type="number" defaultValue={editing.paymentTermsDays} min={0} max={180} className="input" />
              </div>
              <textarea name="notes" defaultValue={editing.notes ?? ''} placeholder="Notes" rows={2} className="input" />
              <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                <div>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>Receives marketing</p>
                  <p className="text-muted text-[10px] mt-0.5">Customer agreed to WhatsApp broadcasts (POPIA opt-in).</p>
                </div>
                <input
                  type="checkbox"
                  name="marketingOptIn"
                  defaultChecked={editing.marketingOptIn ?? false}
                  className="w-5 h-5 accent-brand"
                />
              </label>
              <button type="submit" disabled={isPending} className="btn-primary mt-2">{isPending ? 'Saving…' : 'Save Changes'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
