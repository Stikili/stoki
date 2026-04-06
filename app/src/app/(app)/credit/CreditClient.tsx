'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import { CreditEntry } from '@/domain/entities/credit-entry'
import { Debtor } from '@/domain/entities/debtor'
import { createDebtorAction, addCreditAction, clearDebtAction, settlePartialAction } from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import VoiceInput from '@/components/VoiceInput'

export type DebtorWithEntries = Debtor & { entries: CreditEntry[] }

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) }
function getPhoto(id: string) { try { return localStorage.getItem(`stoki_photo_${id}`) } catch { return null } }
function setPhoto(id: string, url: string) { try { localStorage.setItem(`stoki_photo_${id}`, url) } catch {} }

export default function CreditClient({ debtors, totalOutstanding, storeName }: { debtors: DebtorWithEntries[]; totalOutstanding: number; storeName: string }) {
  const { toast, toastUndo } = useToast()
  const [search, setSearch] = useState('')
  const [showAddDebtor, setShowAddDebtor] = useState(false)
  const [creditDebtorId, setCreditDebtorId] = useState<string | null>(null)
  const [settleDebtorId, setSettleDebtorId] = useState<string | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [photoDebtorId, setPhotoDebtorId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => { const q = search.toLowerCase().trim(); return q ? debtors.filter(d => d.name.toLowerCase().includes(q) || (d.phone ?? '').includes(q)) : debtors }, [debtors, search])
  const creditDebtor = debtors.find(d => d.id === creditDebtorId)
  const settleDebtor = debtors.find(d => d.id === settleDebtorId)

  function handleAddDebtor(fd: FormData) { startTransition(async () => { await createDebtorAction(fd); setShowAddDebtor(false); toast('Customer added') }) }
  function handleAddCredit(fd: FormData) { startTransition(async () => { await addCreditAction(fd); setCreditDebtorId(null); toast('Credit recorded', 'info') }) }

  function handleClearDebt(d: Debtor) {
    haptic(50)
    startTransition(async () => {
      await clearDebtAction(d.id, d.totalOwed)
      toastUndo(`${d.name} — R${d.totalOwed.toFixed(2)} cleared`, () => startTransition(() => settlePartialAction(d.id, -d.totalOwed)))
    })
  }

  function handleSettle() {
    const amt = parseFloat(settleAmount)
    if (!settleDebtor || isNaN(amt) || amt <= 0) return
    if (amt > settleDebtor.totalOwed) { toast('Exceeds amount owed', 'error'); return }
    haptic(50)
    startTransition(async () => { await settlePartialAction(settleDebtor.id, amt); toast(`R${amt.toFixed(2)} settled`); setSettleDebtorId(null); setSettleAmount('') })
  }

  function sendWhatsApp(d: Debtor) {
    if (!d.phone) return
    const ph = d.phone.replace(/\D/g, '').replace(/^0/, '27')
    window.open(`https://wa.me/${ph}?text=${encodeURIComponent(`Hi ${d.name}, friendly reminder: you owe R${d.totalOwed.toFixed(2)} at ${storeName}. Thank you!`)}`, '_blank')
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !photoDebtorId) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image(); img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 200; const ctx = c.getContext('2d')!
        const s = Math.max(200/img.width, 200/img.height), w = img.width*s, h = img.height*s
        ctx.drawImage(img, (200-w)/2, (200-h)/2, w, h)
        setPhoto(photoDebtorId!, c.toDataURL('image/jpeg', 0.7)); setPhotoDebtorId(null); toast('Photo saved')
      }; img.src = reader.result as string
    }; reader.readAsDataURL(file)
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Credit Book</h1>
        <button onClick={() => setShowAddDebtor(true)} className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: '#00C896', color: '#0A0E17' }}>+</button>
      </div>

      {/* Total */}
      <div className="card p-5 mb-4">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Total Outstanding</p>
        <p className={`text-3xl font-bold ${totalOutstanding > 0 ? 'text-danger' : 'text-brand'}`}>R{totalOutstanding.toFixed(2)}</p>
        <p className="text-muted text-sm mt-1">{debtors.filter(d => d.totalOwed > 0).length} customer{debtors.filter(d => d.totalOwed > 0).length !== 1 ? 's' : ''} owe you</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…" className="input" style={{ paddingLeft: 40 }} /></div>
        <VoiceInput onResult={setSearch} />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted py-12">{debtors.length === 0 ? 'No debtors — tap + to add' : 'No matches'}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(d => {
            const isExp = expandedId === d.id, unsettled = d.entries.filter(e => !e.settledAt), photo = getPhoto(d.id)
            return (
              <div key={d.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <button onClick={() => { setPhotoDebtorId(d.id); fileRef.current?.click() }}
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden min-h-0"
                      style={{ background: photo ? 'none' : '#1A2236' }}>
                      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <span className="text-muted text-sm font-bold">{d.name[0].toUpperCase()}</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{d.name}</p>
                      {d.phone && <p className="text-muted text-xs mt-0.5">{d.phone}</p>}
                    </div>
                    <p className={`font-bold text-xl flex-shrink-0 ${d.totalOwed > 0 ? 'text-danger' : 'text-brand'}`}>R{d.totalOwed.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-3" style={{ borderTop: '1px solid #1E293B' }}>
                    <button onClick={() => setCreditDebtorId(d.id)} className="pill pill-orange min-h-0 text-xs">Add Credit</button>
                    {d.totalOwed > 0 && (
                      <>
                        <button onClick={() => { setSettleDebtorId(d.id); setSettleAmount('') }} className="pill pill-green min-h-0 text-xs">Settle</button>
                        <button onClick={() => handleClearDebt(d)} disabled={isPending} className="text-xs font-semibold px-3 py-1 rounded-lg min-h-0" style={{ background: '#1A2236', color: '#8896AB', opacity: isPending ? 0.5 : 1 }}>All Paid</button>
                        {d.phone && <button onClick={() => sendWhatsApp(d)} className="text-xs font-semibold px-3 py-1 rounded-lg min-h-0" style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>WA</button>}
                      </>
                    )}
                    {d.entries.length > 0 && (
                      <button onClick={() => setExpandedId(isExp ? null : d.id)} className="text-xs font-semibold px-3 py-1 rounded-lg min-h-0" style={{ background: '#1A2236', color: '#8896AB' }}>
                        {isExp ? 'Hide' : `${unsettled.length} entries`}
                      </button>
                    )}
                  </div>
                </div>
                {isExp && d.entries.length > 0 && (
                  <div style={{ borderTop: '1px solid #1E293B', background: '#0F1523' }}>
                    {d.entries.map(e => (
                      <div key={e.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1A2236' }}>
                        <div><p className="text-sm text-white">R{e.amount.toFixed(2)}</p><p className="text-xs text-muted mt-0.5">{fmtDate(e.createdAt)}</p></div>
                        <span className={`pill text-xs ${e.settledAt ? 'pill-green' : 'pill-red'}`}>{e.settledAt ? 'Paid' : 'Owing'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add debtor sheet */}
      {showAddDebtor && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"><div className="absolute inset-0 bg-black/70" onClick={() => setShowAddDebtor(false)} />
          <div className="relative rounded-t-3xl p-6 pb-10 sheet"><div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-5">New Customer</h2>
            <form action={handleAddDebtor} className="flex flex-col gap-3">
              <input name="name" placeholder="Customer name *" required autoFocus className="input" />
              <input name="phone" type="tel" placeholder="Phone (for WhatsApp reminders)" className="input" />
              <button type="submit" disabled={isPending} className="btn-primary mt-2">{isPending ? 'Saving…' : 'Add Customer'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Add credit sheet */}
      {creditDebtorId && creditDebtor && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"><div className="absolute inset-0 bg-black/70" onClick={() => setCreditDebtorId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-10 sheet"><div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-1">Add Credit</h2>
            <p className="text-muted text-sm mb-5">{creditDebtor.name} · owes R{creditDebtor.totalOwed.toFixed(2)}</p>
            <form action={handleAddCredit} className="flex flex-col gap-3">
              <input type="hidden" name="debtorId" value={creditDebtorId} />
              <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (R) *" required autoFocus className="input" />
              <button type="submit" disabled={isPending} className="btn-primary mt-2" style={{ background: '#F97316' }}>{isPending ? 'Saving…' : 'Record Credit'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Settle sheet */}
      {settleDebtorId && settleDebtor && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"><div className="absolute inset-0 bg-black/70" onClick={() => setSettleDebtorId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-10 sheet"><div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-1">Settle Debt</h2>
            <p className="text-muted text-sm mb-5">{settleDebtor.name} · owes R{settleDebtor.totalOwed.toFixed(2)}</p>
            <div className="flex flex-col gap-3">
              <input type="number" step="0.01" min="0.01" max={settleDebtor.totalOwed} placeholder={`Amount (max R${settleDebtor.totalOwed.toFixed(2)})`} value={settleAmount} onChange={e => setSettleAmount(e.target.value)} autoFocus className="input" />
              <div className="flex gap-2">
                <button onClick={() => setSettleAmount(settleDebtor.totalOwed.toFixed(2))} className="flex-1 text-xs font-semibold py-3 rounded-xl" style={{ background: '#1A2236', color: '#8896AB' }}>Full</button>
                <button onClick={() => setSettleAmount((settleDebtor.totalOwed/2).toFixed(2))} className="flex-1 text-xs font-semibold py-3 rounded-xl" style={{ background: '#1A2236', color: '#8896AB' }}>Half</button>
              </div>
              <button onClick={handleSettle} disabled={isPending || !settleAmount} className="btn-primary mt-1" style={{ opacity: (isPending || !settleAmount) ? 0.5 : 1 }}>
                {isPending ? 'Saving…' : `Settle R${parseFloat(settleAmount || '0').toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
