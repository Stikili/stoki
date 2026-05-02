'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ProductWithStatus } from '@/domain/entities/product'
import { BundleComponent, bundleCost, bundlesAvailable } from '@/domain/entities/bundle'
import { saveBundleComponentsAction } from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import { Plus, Trash2 } from 'lucide-react'

interface Row {
  componentId: string
  qty: number
}

export default function BundleEditClient({
  bundle,
  products,
  components,
}: {
  bundle: ProductWithStatus
  products: ProductWithStatus[]
  components: BundleComponent[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>(
    components.map((c) => ({ componentId: c.componentId, qty: c.qty })),
  )
  const [isPending, startTransition] = useTransition()

  const productById = new Map(products.map((p) => [p.id, p]))

  const enriched = rows.map((r) => {
    const product = productById.get(r.componentId)
    return {
      ...r,
      componentName: product?.name ?? null,
      componentCost: product?.cost ?? null,
      componentQty: product?.qty ?? null,
    }
  })

  const totalCost = bundleCost(enriched)
  const available = bundlesAvailable(enriched)
  const margin = bundle.price - totalCost
  const marginPct = bundle.price > 0 ? (margin / bundle.price) * 100 : 0

  function addRow() {
    setRows((prev) => [...prev, { componentId: '', qty: 1 }])
  }
  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (i === j ? { ...r, ...patch } : r)))
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i))
  }

  function handleSave() {
    const valid = rows.filter((r) => r.componentId && r.qty > 0)
    // Catch duplicate components — same product appearing twice is a config error.
    const seen = new Set<string>()
    for (const r of valid) {
      if (seen.has(r.componentId)) {
        toast(`"${productById.get(r.componentId)?.name}" appears twice — combine quantities`, 'error')
        return
      }
      seen.add(r.componentId)
    }
    startTransition(async () => {
      try {
        await saveBundleComponentsAction(bundle.id, valid)
        haptic(50)
        toast('Bundle components saved')
        router.push('/inventory')
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Save failed', 'error')
      }
    })
  }

  return (
    <>
      <h1 className="text-xl font-bold text-white mt-3 mb-1">{bundle.name}</h1>
      <p className="text-muted text-sm mb-4">
        Sells for R{bundle.price.toFixed(2)}. Pick the components and how many of each
        per bundle — selling 1 bundle decrements stock from each.
      </p>

      {/* Live summary */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>R{totalCost.toFixed(2)}</p>
            <p className="text-muted text-[10px] uppercase">Cost</p>
          </div>
          <div>
            <p className={`text-sm font-bold ${margin >= 0 ? 'text-brand' : 'text-danger'}`}>
              R{margin.toFixed(2)} <span className="text-[10px] font-normal">({marginPct.toFixed(0)}%)</span>
            </p>
            <p className="text-muted text-[10px] uppercase">Margin</p>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
              {available === Infinity ? '—' : available}
            </p>
            <p className="text-muted text-[10px] uppercase">Sellable now</p>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2 mb-4">
        {rows.length === 0 ? (
          <p className="text-muted text-sm text-center py-6">No components yet — add one below</p>
        ) : (
          rows.map((row, i) => {
            const p = productById.get(row.componentId)
            const stockLow = p && row.qty > p.qty
            return (
              <div key={i} className="card p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={row.componentId}
                    onChange={(e) => updateRow(i, { componentId: e.target.value })}
                    className="input flex-1"
                  >
                    <option value="">— pick product —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={(e) => updateRow(i, { qty: parseInt(e.target.value) || 0 })}
                    className="input w-20"
                    style={{ flex: 'none' }}
                  />
                  <button
                    onClick={() => removeRow(i)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
                  >
                    <Trash2 size={14} color="#7B8CA1" />
                  </button>
                </div>
                {p && (
                  <p className="text-muted text-[10px] mt-1.5 ml-1">
                    Cost R{(p.cost * row.qty).toFixed(2)} · stock {p.qty}{' '}
                    {stockLow && <span className="text-danger">(need {row.qty})</span>}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      <button
        onClick={addRow}
        className="card p-3 w-full text-sm font-semibold mb-4"
        style={{ color: 'var(--foreground)' }}
      >
        <Plus size={14} className="inline mr-1.5" />
        Add component
      </button>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="btn-primary w-full"
      >
        {isPending ? 'Saving…' : 'Save bundle'}
      </button>
    </>
  )
}
