'use client'

import { useState, useTransition, useMemo } from 'react'
import { ProductWithStatus } from '@/domain/entities/product'
import { Stocktake, totalVarianceValue } from '@/domain/entities/stocktake'
import { submitStocktakeAction } from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import { Search, ClipboardCheck } from 'lucide-react'

export default function StocktakeClient({
  products,
  recent,
}: {
  products: ProductWithStatus[]
  recent: Stocktake[]
}) {
  const { toast } = useToast()
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [notes, setNotes] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return products
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q),
    )
  }, [products, search])

  // Pending variance summary — only counts products the user has actually entered.
  const pending = useMemo(() => {
    let touched = 0
    let varianceUnits = 0
    let varianceValue = 0
    for (const [productId, raw] of Object.entries(counts)) {
      if (raw === '' || raw === undefined) continue
      const counted = parseInt(raw)
      if (!Number.isFinite(counted)) continue
      const product = products.find((p) => p.id === productId)
      if (!product) continue
      touched++
      const v = counted - product.qty
      if (v !== 0) {
        varianceUnits += Math.abs(v)
        varianceValue += v * product.cost
      }
    }
    return { touched, varianceUnits, varianceValue }
  }, [counts, products])

  function setCount(productId: string, value: string) {
    setCounts((prev) => ({ ...prev, [productId]: value }))
  }

  function handleSubmit() {
    const payload: Record<string, number> = {}
    for (const [productId, raw] of Object.entries(counts)) {
      if (raw === '' || raw === undefined) continue
      const n = parseInt(raw)
      if (Number.isFinite(n) && n >= 0) payload[productId] = n
    }
    if (Object.keys(payload).length === 0) {
      toast('Enter at least one count first', 'error')
      return
    }
    startTransition(async () => {
      try {
        const result = await submitStocktakeAction(payload, notes.trim() || undefined)
        haptic([50, 30, 50])
        const variance = result.totalVarianceValue
        const sign = variance >= 0 ? '+' : '−'
        toast(
          `Stocktake saved · ${result.variancesAdjusted} adjusted · ${sign}R${Math.abs(variance).toFixed(2)}`,
        )
        setCounts({})
        setNotes('')
        setConfirmOpen(false)
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to save stocktake', 'error')
      }
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Stocktake</h1>
        {recent.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            className="text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
          >
            History
          </button>
        )}
      </div>

      <p className="text-muted text-sm mb-4">
        Count what&apos;s on your shelf. Type the actual quantity and we&apos;ll fix the system to match.
      </p>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2"><Search size={16} color="#7B8CA1" /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products or SKU…"
          className="input"
          style={{ paddingLeft: 40 }}
        />
      </div>

      {/* Pending summary */}
      {pending.touched > 0 && (
        <div className="card p-4 mb-4" style={{ borderColor: pending.varianceValue < 0 ? 'rgba(239,68,68,0.3)' : pending.varianceValue > 0 ? 'rgba(0,200,150,0.3)' : 'var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>
              <span className="font-semibold">{pending.touched}</span> counted
              {pending.varianceUnits > 0 && (
                <> · <span className="font-semibold">{pending.varianceUnits}</span> units variance</>
              )}
            </p>
            {pending.varianceValue !== 0 && (
              <p className={`text-sm font-bold ${pending.varianceValue < 0 ? 'text-danger' : 'text-brand'}`}>
                {pending.varianceValue < 0 ? '−' : '+'}R{Math.abs(pending.varianceValue).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Product list */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted py-16">
          {products.length === 0 ? 'No products yet — add some first' : 'No matches'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => {
            const raw = counts[p.id] ?? ''
            const counted = raw === '' ? null : parseInt(raw)
            const variance = counted !== null && Number.isFinite(counted) ? counted - p.qty : 0
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{p.name}</p>
                    {p.sku && <p className="text-muted text-xs mt-0.5">SKU: {p.sku}</p>}
                  </div>
                  <span className="text-muted text-xs whitespace-nowrap">System: {p.qty}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-muted text-xs flex-shrink-0">Counted</label>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={raw}
                    onChange={(e) => setCount(p.id, e.target.value)}
                    placeholder={String(p.qty)}
                    className="input"
                    style={{ flex: 1 }}
                  />
                  {counted !== null && Number.isFinite(counted) && variance !== 0 && (
                    <span className={`text-xs font-bold whitespace-nowrap ${variance < 0 ? 'text-danger' : 'text-brand'}`}>
                      {variance < 0 ? '' : '+'}{variance}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky submit footer */}
      {pending.touched > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-30">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
            className="btn-primary w-full"
          >
            <ClipboardCheck size={18} className="inline mr-2" />
            Review & submit ({pending.touched})
          </button>
        </div>
      )}

      {/* Confirm sheet */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmOpen(false)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>Confirm stocktake</h2>
            <p className="text-muted text-sm mb-4">
              {pending.touched} product{pending.touched === 1 ? '' : 's'} counted.
              {pending.varianceUnits > 0
                ? ` ${pending.varianceUnits} unit${pending.varianceUnits === 1 ? '' : 's'} of variance — stock will be adjusted.`
                : ' All counts match — no stock changes.'}
            </p>
            {pending.varianceValue !== 0 && (
              <div className="card p-3 mb-4" style={{ borderColor: pending.varianceValue < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(0,200,150,0.3)' }}>
                <p className="text-xs text-muted mb-1">P&amp;L impact</p>
                <p className={`text-xl font-bold ${pending.varianceValue < 0 ? 'text-danger' : 'text-brand'}`}>
                  {pending.varianceValue < 0 ? '−' : '+'}R{Math.abs(pending.varianceValue).toFixed(2)}
                </p>
                <p className="text-muted text-xs mt-1">
                  {pending.varianceValue < 0 ? 'Shrinkage at cost' : 'Found stock at cost'}
                </p>
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes (optional) — e.g. monthly count, post-event"
              className="input mb-3"
            />
            <button onClick={handleSubmit} disabled={isPending} className="btn-primary w-full">
              {isPending ? 'Saving…' : 'Submit stocktake'}
            </button>
          </div>
        </div>
      )}

      {/* History sheet */}
      {showHistory && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowHistory(false)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet max-h-[88vh] overflow-y-auto">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>Recent stocktakes</h2>
            {recent.length === 0 ? (
              <p className="text-muted text-sm">No stocktakes yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recent.map((s) => {
                  const value = totalVarianceValue(s.lines)
                  const adjusted = s.lines.filter((l) => l.variance !== 0).length
                  return (
                    <div key={s.id} className="card p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                          {new Date(s.performedAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <span className={`text-sm font-bold ${value < 0 ? 'text-danger' : value > 0 ? 'text-brand' : 'text-muted'}`}>
                          {value === 0 ? 'Balanced' : `${value < 0 ? '−' : '+'}R${Math.abs(value).toFixed(2)}`}
                        </span>
                      </div>
                      <p className="text-muted text-xs">
                        {s.lines.length} counted · {adjusted} adjusted
                      </p>
                      {s.notes && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{s.notes}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
