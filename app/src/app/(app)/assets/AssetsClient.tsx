'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type FixedAsset, type AssetCategory, ASSET_CATEGORIES,
} from '@/domain/entities/fixed-asset'
import { ArrowLeft, Plus, Trash2, Archive } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import { createAssetAction, disposeAssetAction, archiveAssetAction } from './actions'

type Decorated = FixedAsset & { monthly: number; book: number }

function fmtMoney(n: number) { return `R${n.toFixed(2)}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
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

export default function AssetsClient({
  assets, totalCost, totalBook, monthlyCharge,
}: {
  assets: Decorated[]
  totalCost: number
  totalBook: number
  monthlyCharge: number
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onAdd(input: {
    name: string
    category: AssetCategory
    cost: number
    residualValue: number
    usefulLifeMonths: number
    purchaseDate: string
    notes: string
  }) {
    startTransition(async () => {
      const res = await createAssetAction(input)
      if (res.ok) {
        haptic(20); toast('Asset added')
        setShowAdd(false); router.refresh()
      } else {
        toast(res.error ?? 'Failed to add asset')
      }
    })
  }

  function onDispose(id: string) {
    const today = new Date().toISOString().slice(0, 10)
    if (!confirm('Mark this asset as disposed? Future depreciation stops.')) return
    startTransition(async () => {
      const res = await disposeAssetAction(id, today)
      if (res.ok) { toast('Asset disposed'); router.refresh() }
      else toast(res.error ?? 'Failed')
    })
  }

  function onArchive(id: string) {
    if (!confirm('Remove this asset entirely from the register? Past depreciation entries are kept.')) return
    startTransition(async () => {
      const res = await archiveAssetAction(id)
      if (res.ok) { toast('Asset removed'); router.refresh() }
      else toast(res.error ?? 'Failed')
    })
  }

  if (showAdd) {
    return <AddForm onCancel={() => setShowAdd(false)} onSubmit={onAdd} isPending={isPending} />
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <ArrowLeft size={18} color="#7B8CA1" />
          </Link>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Fixed assets</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm w-auto"
        >
          <Plus size={14} /> Add asset
        </button>
      </div>

      {/* Hero — register snapshot */}
      <div className="card p-5 mb-3">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-1">Book value (active assets)</p>
        <p className="text-3xl font-bold leading-none" style={{ color: 'var(--foreground)' }}>{fmtMoney(totalBook)}</p>
        <p className="text-muted text-sm mt-1">
          {fmtMoney(totalCost)} cost · −{fmtMoney(monthlyCharge)}/month depreciation
        </p>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={<Archive />}
          tone="cyan"
          title="No fixed assets yet"
          description="Add fridges, vehicles, tills, computers and furniture. Stoki depreciates each one monthly so your P&L is honest."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {assets.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {a.name}
                  </p>
                  <p className="text-muted text-xs mt-0.5 truncate">
                    {ASSET_CATEGORIES.find(c => c.value === a.category)?.label ?? a.category}
                    {' · '}
                    {fmtMoney(a.cost)} on {fmtDate(a.purchaseDate)}
                    {' · '}
                    {a.usefulLifeMonths} months
                  </p>
                  {a.status !== 'active' && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: a.status === 'disposed' ? '#EF4444' : '#7B8CA1' }}>
                      {a.status === 'disposed' ? 'disposed' : 'fully depreciated'}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: 'var(--foreground)' }}>{fmtMoney(a.book)}</p>
                  <p className="text-muted text-[11px] mt-0.5">
                    −{fmtMoney(a.monthly)}/mo
                  </p>
                </div>
              </div>
              {a.status === 'active' && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <button
                    onClick={() => onDispose(a.id)}
                    disabled={isPending}
                    className="rounded-xl px-3 py-2 text-xs font-semibold"
                    style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
                  >
                    Mark disposed
                  </button>
                  <button
                    onClick={() => onArchive(a.id)}
                    disabled={isPending}
                    className="rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: '#EF4444' }}
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function AddForm({
  onCancel, onSubmit, isPending,
}: {
  onCancel: () => void
  onSubmit: (input: {
    name: string
    category: AssetCategory
    cost: number
    residualValue: number
    usefulLifeMonths: number
    purchaseDate: string
    notes: string
  }) => void
  isPending: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [category, setCategory] = useState<AssetCategory>('fridge')
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [residual, setResidual] = useState('0')
  const [life, setLife] = useState('60')
  const [purchaseDate, setPurchaseDate] = useState(today)
  const [notes, setNotes] = useState('')

  function onCategoryChange(v: AssetCategory) {
    setCategory(v)
    const def = ASSET_CATEGORIES.find(c => c.value === v)?.defaultLifeMonths
    if (def) setLife(String(def))
  }

  const costNum = parseFloat(cost)
  const residualNum = parseFloat(residual || '0')
  const lifeNum = parseInt(life, 10)
  const canSubmit = name.trim().length > 0
    && Number.isFinite(costNum) && costNum > 0
    && Number.isFinite(lifeNum) && lifeNum > 0
    && !!purchaseDate

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <ArrowLeft size={18} color="#7B8CA1" />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Add asset</h1>
      </div>

      <div className="card p-5 flex flex-col gap-3">
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Category</p>
          <select value={category} onChange={(e) => onCategoryChange(e.target.value as AssetCategory)} style={fieldStyle}>
            {ASSET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Name</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Defy 410L double-door fridge" style={fieldStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Cost (R)</p>
            <input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" style={fieldStyle} />
          </div>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Residual (R)</p>
            <input type="number" step="0.01" min="0" value={residual} onChange={(e) => setResidual(e.target.value)} style={fieldStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Purchase date</p>
            <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Useful life (months)</p>
            <input type="number" min="1" value={life} onChange={(e) => setLife(e.target.value)} style={fieldStyle} />
          </div>
        </div>
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Notes (optional)</p>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>
        <button
          onClick={() => onSubmit({
            name: name.trim(),
            category,
            cost: costNum,
            residualValue: Number.isFinite(residualNum) ? residualNum : 0,
            usefulLifeMonths: lifeNum,
            purchaseDate,
            notes,
          })}
          disabled={!canSubmit || isPending}
          className="btn-primary mt-1"
        >
          {isPending ? 'Saving…' : 'Add asset'}
        </button>
      </div>
    </>
  )
}
