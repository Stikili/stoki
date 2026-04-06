'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import { CreditEntry } from '@/domain/entities/credit-entry'
import { Debtor } from '@/domain/entities/debtor'
import { createDebtorAction, addCreditAction, clearDebtAction, settlePartialAction } from './actions'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptic'
import VoiceInput from '@/components/VoiceInput'

export type DebtorWithEntries = Debtor & { entries: CreditEntry[] }

const cardStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 20px rgba(0,0,0,0.25)',
}

const sheetStyle = {
  background: 'rgba(8,18,32,0.97)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderTop: '1px solid rgba(255,255,255,0.1)',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: '14px',
  padding: '14px 16px',
  fontSize: '15px',
  outline: 'none',
  width: '100%',
} as const

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getDebtorPhoto(debtorId: string): string | null {
  try { return localStorage.getItem(`stoki_photo_${debtorId}`) } catch { return null }
}
function setDebtorPhoto(debtorId: string, dataUrl: string) {
  try { localStorage.setItem(`stoki_photo_${debtorId}`, dataUrl) } catch { /* quota */ }
}

export default function CreditClient({
  debtors,
  totalOutstanding,
  storeName,
}: {
  debtors: DebtorWithEntries[]
  totalOutstanding: number
  storeName: string
}) {
  const { toast, toastUndo } = useToast()
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [showAddDebtor, setShowAddDebtor] = useState(false)
  const [creditDebtorId, setCreditDebtorId] = useState<string | null>(null)
  const [settleDebtorId, setSettleDebtorId] = useState<string | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [photoDebtorId, setPhotoDebtorId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return debtors
    return debtors.filter((d) =>
      d.name.toLowerCase().includes(q) || (d.phone ?? '').toLowerCase().includes(q)
    )
  }, [debtors, search])

  const creditDebtor = debtors.find((d) => d.id === creditDebtorId)
  const settleDebtor = debtors.find((d) => d.id === settleDebtorId)

  function handleAddDebtor(formData: FormData) {
    startTransition(async () => {
      await createDebtorAction(formData)
      setShowAddDebtor(false)
      toast(t('credit.newCustomer') + ' added')
    })
  }

  function handleAddCredit(formData: FormData) {
    startTransition(async () => {
      await addCreditAction(formData)
      setCreditDebtorId(null)
      toast('Credit recorded', 'info')
    })
  }

  // Undo-able clear debt — execute immediately, offer undo
  function handleClearDebt(debtor: Debtor) {
    haptic(50)
    startTransition(async () => {
      await clearDebtAction(debtor.id, debtor.totalOwed)
      toastUndo(`${debtor.name} — R${debtor.totalOwed.toFixed(2)} cleared`, () => {
        // Undo: re-add the debt (negative settlement = add back)
        startTransition(() => settlePartialAction(debtor.id, -debtor.totalOwed))
      })
    })
  }

  function handlePartialSettle() {
    const amount = parseFloat(settleAmount)
    if (!settleDebtor || isNaN(amount) || amount <= 0) return
    if (amount > settleDebtor.totalOwed) {
      toast('Amount exceeds what is owed', 'error')
      return
    }
    haptic(50)
    startTransition(async () => {
      await settlePartialAction(settleDebtor.id, amount)
      toast(`R${amount.toFixed(2)} settled for ${settleDebtor.name}`)
      setSettleDebtorId(null)
      setSettleAmount('')
    })
  }

  function sendWhatsApp(debtor: Debtor) {
    if (!debtor.phone) return
    const phone = debtor.phone.replace(/\D/g, '').replace(/^0/, '27')
    const msg = encodeURIComponent(`Hi ${debtor.name}, this is a friendly reminder that you owe R${debtor.totalOwed.toFixed(2)} at ${storeName}. Thank you!`)
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !photoDebtorId) return
    const reader = new FileReader()
    reader.onload = () => {
      // Resize to max 200px for localStorage efficiency
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 200
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')!
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale, h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        setDebtorPhoto(photoDebtorId, canvas.toDataURL('image/jpeg', 0.7))
        setPhotoDebtorId(null)
        toast('Photo saved')
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">{t('credit.creditBook')}</h1>
        <button
          onClick={() => setShowAddDebtor(true)}
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg"
          style={{ background: 'linear-gradient(135deg, #00C896, #00a87e)', boxShadow: '0 0 20px rgba(0,200,150,0.4), 0 1px 0 rgba(255,255,255,0.25) inset', color: '#080f1a' }}
        >+</button>
      </div>

      {/* Total outstanding hero */}
      <div
        className="rounded-3xl p-5 mb-4 relative overflow-hidden"
        style={totalOutstanding > 0
          ? { background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(180,20,20,0.06) 100%)', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 0 40px rgba(239,68,68,0.12), 0 1px 0 rgba(255,255,255,0.08) inset' }
          : { background: 'linear-gradient(135deg, rgba(0,200,150,0.12) 0%, rgba(0,120,90,0.05) 100%)', border: '1px solid rgba(0,200,150,0.2)', boxShadow: '0 0 40px rgba(0,200,150,0.1), 0 1px 0 rgba(255,255,255,0.08) inset' }
        }
      >
        <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none rounded-t-3xl" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)' }} />
        <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${totalOutstanding > 0 ? 'text-danger/70' : 'text-brand/70'}`}>{t('credit.totalOutstanding')}</p>
        <p className="text-4xl font-bold mb-1" style={totalOutstanding > 0
          ? { background: 'linear-gradient(135deg, #ff6b6b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
          : { background: 'linear-gradient(135deg, #ffffff, #a8f0da)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
        }>
          R{totalOutstanding.toFixed(2)}
        </p>
        <p className="text-muted text-sm">{debtors.filter((d) => d.totalOwed > 0).length} customer{debtors.filter((d) => d.totalOwed > 0).length !== 1 ? 's' : ''} owe you</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('credit.search')}
            style={{ ...inputStyle, paddingLeft: '40px' }}
          />
        </div>
        <VoiceInput onResult={setSearch} />
      </div>

      {/* Debtor list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={cardStyle}><span className="text-3xl">📋</span></div>
          <p className="text-white font-semibold mb-1">{debtors.length === 0 ? 'No debtors' : 'No matches'}</p>
          <p className="text-muted text-sm">{debtors.length === 0 ? 'Tap + to record a credit sale' : 'Try a different search'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((d) => {
            const isExpanded = expandedId === d.id
            const unsettled = d.entries.filter((e) => !e.settledAt)
            const photo = getDebtorPhoto(d.id)
            return (
              <div key={d.id} className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      {/* Photo avatar */}
                      <button
                        onClick={() => { setPhotoDebtorId(d.id); fileInputRef.current?.click() }}
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: photo ? 'none' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                      >
                        {photo ? (
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-muted text-xs font-bold">{d.name.charAt(0).toUpperCase()}</span>
                        )}
                      </button>
                      <div>
                        <p className="text-white font-semibold">{d.name}</p>
                        {d.phone && <p className="text-muted text-xs mt-0.5">{d.phone}</p>}
                      </div>
                    </div>
                    <p className="font-bold text-xl flex-shrink-0 ml-3" style={d.totalOwed > 0
                      ? { background: 'linear-gradient(135deg, #ff6b6b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
                      : { color: '#00C896' }
                    }>
                      R{d.totalOwed.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                    <button
                      onClick={() => setCreditDebtorId(d.id)}
                      className="flex-1 text-xs font-semibold py-2.5 rounded-xl"
                      style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.2)' }}
                    >{t('credit.addCredit')}</button>
                    {d.totalOwed > 0 && (
                      <>
                        <button
                          onClick={() => { setSettleDebtorId(d.id); setSettleAmount('') }}
                          className="flex-1 text-xs font-semibold py-2.5 rounded-xl"
                          style={{ background: 'rgba(0,200,150,0.12)', color: '#00C896', border: '1px solid rgba(0,200,150,0.2)' }}
                        >{t('credit.settle')}</button>
                        <button
                          onClick={() => handleClearDebt(d)}
                          disabled={isPending}
                          className="text-xs font-semibold px-3 py-2.5 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#5a7a94', border: '1px solid rgba(255,255,255,0.08)', opacity: isPending ? 0.5 : 1 }}
                        >{t('credit.allPaid')}</button>
                      </>
                    )}
                    {/* WhatsApp remind */}
                    {d.totalOwed > 0 && d.phone && (
                      <button
                        onClick={() => sendWhatsApp(d)}
                        className="text-xs font-semibold px-3 py-2.5 rounded-xl"
                        style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)' }}
                      >
                        WA
                      </button>
                    )}
                    {d.entries.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                        className="px-3 text-xs font-semibold py-2.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#5a7a94', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {isExpanded ? 'Hide' : `${unsettled.length} entry${unsettled.length !== 1 ? 's' : ''}`}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && d.entries.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                    {d.entries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <p className="text-sm text-white">R{e.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted mt-0.5">{fmtDate(e.createdAt)}</p>
                        </div>
                        {e.settledAt
                          ? <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(0,200,150,0.1)', color: '#00C896' }}>Paid</span>
                          : <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Owing</span>
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Debtor sheet */}
      {showAddDebtor && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAddDebtor(false)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-5">{t('credit.newCustomer')}</h2>
            <form action={handleAddDebtor} className="flex flex-col gap-3">
              <input name="name" placeholder="Customer name *" required autoFocus style={inputStyle} />
              <input name="phone" type="tel" placeholder="Phone number (for WhatsApp reminders)" style={inputStyle} />
              <button type="submit" disabled={isPending} style={{ background: 'linear-gradient(135deg, #00C896 0%, #00a87e 100%)', boxShadow: '0 0 24px rgba(0,200,150,0.35)', borderRadius: '14px', padding: '14px', color: '#080f1a', fontWeight: 700, fontSize: '15px', width: '100%', marginTop: '8px', opacity: isPending ? 0.6 : 1 }}>
                {isPending ? t('common.saving') : t('common.save')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Credit sheet */}
      {creditDebtorId && creditDebtor && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setCreditDebtorId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-1">{t('credit.addCredit')}</h2>
            <p className="text-muted text-sm mb-5">{creditDebtor.name} · owes R{creditDebtor.totalOwed.toFixed(2)}</p>
            <form action={handleAddCredit} className="flex flex-col gap-3">
              <input type="hidden" name="debtorId" value={creditDebtorId} />
              <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (R) *" required autoFocus style={inputStyle} />
              <button type="submit" disabled={isPending} style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 0 20px rgba(249,115,22,0.3)', borderRadius: '14px', padding: '14px', color: 'white', fontWeight: 700, fontSize: '15px', width: '100%', marginTop: '8px', opacity: isPending ? 0.6 : 1 }}>
                {isPending ? t('common.saving') : t('credit.addCredit')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Partial settle sheet */}
      {settleDebtorId && settleDebtor && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSettleDebtorId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-1">{t('credit.settle')}</h2>
            <p className="text-muted text-sm mb-5">{settleDebtor.name} · owes R{settleDebtor.totalOwed.toFixed(2)}</p>
            <div className="flex flex-col gap-3">
              <input type="number" step="0.01" min="0.01" max={settleDebtor.totalOwed} placeholder={`Amount (max R${settleDebtor.totalOwed.toFixed(2)})`} value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} autoFocus style={inputStyle} />
              <div className="flex gap-2">
                <button onClick={() => setSettleAmount(settleDebtor.totalOwed.toFixed(2))} className="flex-1 text-xs font-semibold py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: '#5a7a94', border: '1px solid rgba(255,255,255,0.1)' }}>Full (R{settleDebtor.totalOwed.toFixed(2)})</button>
                <button onClick={() => setSettleAmount((settleDebtor.totalOwed / 2).toFixed(2))} className="flex-1 text-xs font-semibold py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: '#5a7a94', border: '1px solid rgba(255,255,255,0.1)' }}>Half (R{(settleDebtor.totalOwed / 2).toFixed(2)})</button>
              </div>
              <button onClick={handlePartialSettle} disabled={isPending || !settleAmount}
                style={{ background: 'linear-gradient(135deg, #00C896 0%, #00a87e 100%)', boxShadow: '0 0 24px rgba(0,200,150,0.35)', borderRadius: '14px', padding: '14px', color: '#080f1a', fontWeight: 700, fontSize: '15px', width: '100%', marginTop: '4px', opacity: (isPending || !settleAmount) ? 0.6 : 1 }}>
                {isPending ? t('common.saving') : `${t('credit.settle')} R${parseFloat(settleAmount || '0').toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
