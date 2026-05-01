'use client'

import { useState, useTransition } from 'react'
import { Supplier } from '@/domain/entities/supplier'
import { addSupplierAction, editSupplierAction, archiveSupplierAction } from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import { Plus, Phone } from 'lucide-react'

interface SupplierStats { spend: number; lastDelivery: string | null; count: number }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export default function SuppliersClient({
  suppliers,
  stats,
}: {
  suppliers: Supplier[]
  stats: Record<string, SupplierStats>
}) {
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const editing = suppliers.find(s => s.id === editId)

  function handleAdd(fd: FormData) {
    startTransition(async () => {
      await addSupplierAction(fd)
      setShowAdd(false)
      haptic(30)
      toast('Supplier added')
    })
  }

  function handleEdit(fd: FormData) {
    startTransition(async () => {
      await editSupplierAction(fd)
      setEditId(null)
      toast('Supplier updated')
    })
  }

  function handleArchive(id: string) {
    haptic(50)
    startTransition(async () => {
      await archiveSupplierAction(id)
      setEditId(null)
      toast('Supplier archived', 'info')
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Suppliers</h1>
        <button onClick={() => setShowAdd(true)} className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#00C896' }}>
          <Plus size={20} color="white" strokeWidth={2.5} />
        </button>
      </div>

      {suppliers.length === 0 ? (
        <p className="text-center text-muted py-12">No suppliers yet — tap + to add one.<br/>Use them when restocking to track who you buy from.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {suppliers.map(s => {
            const st = stats[s.id]
            return (
              <button key={s.id} onClick={() => setEditId(s.id)} className="card p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{s.name}</p>
                    {s.contactName && <p className="text-muted text-xs mt-0.5">{s.contactName}</p>}
                    {s.phone && (
                      <p className="text-muted text-xs mt-1 flex items-center gap-1">
                        <Phone size={11} />{s.phone}
                      </p>
                    )}
                  </div>
                  {st && st.count > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-brand font-bold text-sm">R{st.spend.toFixed(2)}</p>
                      <p className="text-muted text-[10px]">90d · {st.count} order{st.count === 1 ? '' : 's'}</p>
                      {st.lastDelivery && <p className="text-muted text-[10px]">last {fmtDate(st.lastDelivery)}</p>}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAdd(false)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--foreground)' }}>New Supplier</h2>
            <form action={handleAdd} className="flex flex-col gap-3">
              <input name="name" placeholder="Supplier name *" required autoFocus className="input" />
              <input name="contactName" placeholder="Contact person" className="input" />
              <input name="phone" type="tel" placeholder="Phone" className="input" />
              <textarea name="notes" placeholder="Notes (delivery days, payment terms…)" rows={3} className="input" />
              <button type="submit" disabled={isPending} className="btn-primary mt-2">{isPending ? 'Saving…' : 'Add Supplier'}</button>
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
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Edit Supplier</h2>
              <button onClick={() => handleArchive(editing.id)} disabled={isPending} className="pill pill-red min-h-0 text-xs">Archive</button>
            </div>
            <form action={handleEdit} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={editing.id} />
              <input name="name" defaultValue={editing.name} required className="input" />
              <input name="contactName" defaultValue={editing.contactName ?? ''} placeholder="Contact person" className="input" />
              <input name="phone" type="tel" defaultValue={editing.phone ?? ''} placeholder="Phone" className="input" />
              <textarea name="notes" defaultValue={editing.notes ?? ''} placeholder="Notes" rows={3} className="input" />
              <button type="submit" disabled={isPending} className="btn-primary mt-2">{isPending ? 'Saving…' : 'Save Changes'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
