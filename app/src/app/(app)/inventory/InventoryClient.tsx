'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { ProductWithStatus, daysUntilExpiry, isExpiringSoon, formatQty, qtyStep, PRODUCT_UNITS } from '@/domain/entities/product'
import { Supplier } from '@/domain/entities/supplier'
import { WASTAGE_REASONS } from '@/domain/entities/wastage'
import type { StoreRole } from '@/domain/entities/store-user'
import {
  addProductAction,
  restockAction,
  editProductAction,
  archiveProductAction,
  bulkImportProductsAction,
  recordWasteAction,
  type CsvImportResult,
} from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import VoiceInput from '@/components/VoiceInput'
import BarcodeScanner from '@/components/BarcodeScanner'
import { matchProductBySku } from '@/lib/product-lookup'
import { ScanBarcode, Plus, Search, Upload, Package } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { useI18n } from '@/lib/i18n'

const SAMPLE_CSV = `name,price,cost,qty,reorder_point,sku
White Bread (700g),16.99,12.00,20,10,BREAD-W-700
Coke 340ml Can,16.99,12.00,40,15,COKE-340
Maggi Noodles,3.99,2.50,80,20,MAGGI-CHK
`

type Filter = 'all' | 'low' | 'out' | 'expiring' | 'low-margin' | 'dead'
const statusPill = { ok: 'pill-green', low: 'pill-yellow', out: 'pill-red' }
const statusText = { ok: 'In Stock', low: 'Low', out: 'Out' }

/** Margin threshold matching the F-P-01 cron — keeps the dashboard alert
 *  and the inventory filter in lockstep. */
const LOW_MARGIN_THRESHOLD = 0.10

export default function InventoryClient({
  products,
  salesVelocity,
  suppliers = [],
  storeVatRegistered = false,
  role = 'owner',
  initialFilter = 'all',
  soldRecentlyIds = [],
}: {
  products: ProductWithStatus[]
  salesVelocity?: Record<string, number>
  suppliers?: Supplier[]
  storeVatRegistered?: boolean
  role?: StoreRole
  initialFilter?: Filter
  /** Product ids that have at least one sale in the dead-stock window
   *  (21 days). Anything with qty>0 and NOT in this set is "dead". */
  soldRecentlyIds?: string[]
}) {
  // Cashier hides cost/margin info — they record sales but don't see profit.
  const canSeeMargins = role !== 'cashier'
  const { toast, toastUndo } = useToast()
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [wasteId, setWasteId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const editProduct = products.find(p => p.id === editId)
  const restockProduct = products.find(p => p.id === restockId)
  const wasteProduct = products.find(p => p.id === wasteId)
  // Capture "now" once per render so expiry calculations stay pure on a given pass.
  const now = useMemo(() => new Date(), [])

  // Set wrapper for fast O(1) "is this product still moving?" checks.
  const soldRecentlySet = useMemo(() => new Set(soldRecentlyIds), [soldRecentlyIds])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter(p => {
      if (filter === 'low' && p.status !== 'low') return false
      if (filter === 'out' && p.status !== 'out') return false
      if (filter === 'expiring' && !isExpiringSoon(p, 7, now)) return false
      if (filter === 'low-margin') {
        // Skip products without a defined cost OR price — margin is meaningless.
        if (p.price <= 0 || p.cost <= 0) return false
        const margin = 1 - p.cost / p.price
        if (margin >= LOW_MARGIN_THRESHOLD) return false
      }
      if (filter === 'dead') {
        // Dead-stock means: still on the shelf, but zero sales in the
        // 21-day window. Products at qty=0 are not "dead", they're "out".
        if (p.qty <= 0) return false
        if (soldRecentlySet.has(p.id)) return false
      }
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [products, filter, search, now, soldRecentlySet])

  function getSuggestion(id: string) { const r = salesVelocity?.[id]; return r && r >= 0.1 ? Math.ceil(r * 7) : null }

  function handleAdd(fd: FormData) { startTransition(async () => { await addProductAction(fd); setShowAdd(false); haptic(30); toast('Product added') }) }
  function handleRestock(fd: FormData) { startTransition(async () => { await restockAction(fd); setRestockId(null); haptic(30); toast('Stock updated') }) }
  function handleEdit(fd: FormData) { startTransition(async () => { await editProductAction(fd); setEditId(null); toast('Product updated') }) }
  function handleWaste(fd: FormData) {
    startTransition(async () => {
      try {
        await recordWasteAction(fd)
        setWasteId(null)
        haptic([50, 30, 50])
        toast('Waste recorded')
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed', 'error')
      }
    })
  }
  function handleImport(csv: string) {
    startTransition(async () => {
      const result = await bulkImportProductsAction(csv)
      if (result.imported > 0) haptic(50)
      toast(`Imported ${result.imported} products${result.skipped ? `, ${result.skipped} skipped` : ''}`)
      // Auto-close on a clean import so the user sees the new products
      // immediately. Keep the sheet open with a result panel only when there
      // were parse errors the user might want to inspect.
      if (result.errors.length === 0 && result.skipped === 0) {
        setShowImport(false)
        setImportResult(null)
      } else {
        setImportResult(result)
      }
    })
  }
  function downloadSampleCsv() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'stoki-products-template.csv'
    a.click()
  }

  function handleArchive(p: ProductWithStatus) {
    haptic(50); setEditId(null)
    startTransition(async () => {
      await archiveProductAction(p.id)
      toastUndo(`"${p.name}" archived`, () => {
        const fd = new FormData(); fd.set('name', p.name); fd.set('price', String(p.price)); fd.set('cost', String(p.cost ?? 0)); fd.set('qty', String(p.qty)); fd.set('reorderPoint', String(p.reorderPoint)); if (p.sku) fd.set('sku', p.sku)
        startTransition(() => addProductAction(fd))
      })
    })
  }

  // Uses the shared matchProductBySku helper for case-insensitive,
  // trim-tolerant lookup — same behaviour as Sales/Stocktake scanning.
  // Previously this used case-sensitive `p.sku === code` so mixed-case
  // SKUs ('ABC-123') scanned fine in Sales but silently missed here
  // (BUG-015 from the 2026-07-18 code review).
  function onBarcodeScan(code: string) {
    setShowScanner(false)
    setSearch(code)
    const { match, ambiguous } = matchProductBySku(products, code)
    if (ambiguous) {
      toast(`Multiple products share SKU "${code}" — review inventory`, 'error')
      return
    }
    toast(match ? `Found: ${match.name}` : `No SKU "${code}"`, match ? 'info' : 'error')
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">{t('inventory.stock')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }} title="Import CSV">
            <Upload size={18} color="#7B8CA1" strokeWidth={1.75} />
          </button>
          <button onClick={() => setShowScanner(true)} className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <ScanBarcode size={18} color="#7B8CA1" strokeWidth={1.75} />
          </button>
          <button onClick={() => setShowAdd(true)} className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#00C896' }}>
            <Plus size={20} color="white" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2"><Search size={16} color="#7B8CA1" /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or SKU…" className="input" style={{ paddingLeft: 40 }} />
        </div>
        <VoiceInput onResult={setSearch} />
      </div>

      {/* Filters — `low-margin` and `dead` are surfaced as deep-link
          targets from the F-P-01 / F-P-03 push alerts as well as filterable
          chips. Order: most-common first, alert-driven slices last. */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all','low','out','expiring','low-margin','dead'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={filter === f ? { background: '#00C896', color: '#0A0E17' } : { background: '#141B2D', color: '#8896AB' }}>
            {f === 'all' ? t('inventory.all')
              : f === 'low' ? t('inventory.lowStock')
              : f === 'out' ? t('inventory.outOfStock')
              : f === 'expiring' ? 'Expiring'
              : f === 'low-margin' ? 'Low margin'
              : 'Dead stock'}
          </button>
        ))}
      </div>

      {/* Products */}
      {filtered.length === 0 ? (
        products.length === 0 ? (
          <EmptyState
            icon={<Package />}
            tone="cyan"
            title="No products yet"
            description="Add what you sell. You can paste a CSV upload or tap + to add one product at a time — name and price is enough to start."
            pointToAction
          />
        ) : (
          <p className="text-center text-muted py-16">{search ? 'No matches' : 'None in this category'}</p>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(p => {
            const sug = getSuggestion(p.id)
            const daysLeft = daysUntilExpiry(p, now)
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{p.name}</p>
                    {p.sku && <p className="text-muted text-xs mt-0.5">SKU: {p.sku}</p>}
                    {daysLeft !== null && daysLeft <= 7 && (
                      <p className={`text-xs mt-0.5 ${daysLeft <= 0 ? 'text-danger' : 'text-warning'}`}>
                        {daysLeft <= 0 ? 'Expired!' : `Expires in ${daysLeft}d`}
                      </p>
                    )}
                  </div>
                  <span className={`pill ml-3 ${statusPill[p.status]}`}>{statusText[p.status]}</span>
                </div>
                {sug && (p.status === 'low' || p.status === 'out') && (
                  <p className="pill pill-blue text-xs mb-2">Suggested restock: {sug} units</p>
                )}
                <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid #1E293B' }}>
                  <span className="text-white font-bold">R{p.price.toFixed(2)}{p.isWeighable && p.unitLabel !== 'each' ? `/${p.unitLabel}` : ''}</span>
                  <span className="text-muted text-sm">{formatQty(p.qty, p)} left</span>
                  {canSeeMargins && <span className="text-muted text-xs">+R{p.margin.toFixed(2)}</span>}
                  <div className="ml-auto flex gap-2 flex-wrap">
                    <button onClick={() => setRestockId(p.id)} className="pill pill-blue min-h-0 text-xs">{t('inventory.restock')}</button>
                    {p.qty > 0 && (
                      <button onClick={() => setWasteId(p.id)} className="text-xs font-semibold px-3 py-1 rounded-lg min-h-0" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>Waste</button>
                    )}
                    <button onClick={() => setEditId(p.id)} className="text-xs font-semibold px-3 py-1 rounded-lg min-h-0" style={{ background: '#1A2236', color: '#8896AB' }}>{t('inventory.edit')}</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAdd(false)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>{t('inventory.addProduct')}</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>You can add cost, SKU and expiry later via Edit.</p>
            <form action={handleAdd} className="flex flex-col gap-3">
              <input name="name" placeholder="Product name" required autoFocus className="input" />
              <div className="grid grid-cols-2 gap-3">
                <input name="price" type="number" step="0.01" min="0" placeholder="Sell price (R)" required className="input" />
                <input name="qty" type="number" min="0" placeholder="Qty in stock" defaultValue="0" className="input" />
              </div>
              <button type="submit" disabled={isPending} className="btn-primary mt-2">{isPending ? t('common.adding') : t('inventory.addProduct')}</button>
            </form>
          </div>
        </div>
      )}

      {/* Restock sheet */}
      {restockId && restockProduct && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setRestockId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>{t('inventory.restock')}</h2>
            <p className="text-muted text-sm mb-1">{restockProduct.name}</p>
            <p className="text-muted text-xs mb-4">Current cost: R{(restockProduct.cost ?? 0).toFixed(2)}</p>
            {getSuggestion(restockId) && <p className="pill pill-blue text-xs mb-4">Suggested: {getSuggestion(restockId)} units</p>}
            <form action={handleRestock} className="flex flex-col gap-3">
              <input type="hidden" name="productId" value={restockId} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted text-xs ml-1 mb-1 block">Units to add *</label>
                  <input name="qty" type="number" min="1" required autoFocus defaultValue={getSuggestion(restockId) ?? undefined} className="input" />
                </div>
                <div>
                  <label className="text-muted text-xs ml-1 mb-1 block">Cost per unit (R)</label>
                  <input name="cost" type="number" step="0.01" min="0" placeholder="Optional" className="input" />
                </div>
              </div>
              {suppliers.length > 0 ? (
                <div>
                  <label className="text-muted text-xs ml-1 mb-1 block">Supplier</label>
                  <select name="supplierId" defaultValue="" className="input">
                    <option value="">— None —</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <a href="/suppliers" className="text-brand text-xs font-semibold ml-1">
                  + Add a supplier to track who you buy from
                </a>
              )}
              <input name="notes" placeholder="Notes (optional)" className="input" />
              <p className="text-muted text-xs -mt-1 ml-1">Cost updates the unit cost using a weighted average so margins stay accurate.</p>
              <button type="submit" disabled={isPending} className="btn-primary mt-2">{isPending ? t('common.saving') : 'Add Stock'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit sheet */}
      {editId && editProduct && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Edit Product</h2>
              <button onClick={() => handleArchive(editProduct)} disabled={isPending} className="pill pill-red min-h-0 text-xs">Archive</button>
            </div>
            <form action={handleEdit} className="flex flex-col gap-3">
              <input type="hidden" name="productId" value={editId} />
              <input name="name" required defaultValue={editProduct.name} className="input" />
              <div className="grid grid-cols-2 gap-3">
                <input name="price" type="number" step="0.01" min="0" required defaultValue={editProduct.price} className="input" />
                <input name="cost" type="number" step="0.01" min="0" defaultValue={editProduct.cost ?? ''} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input name="qty" type="number" step={qtyStep(editProduct)} min="0" defaultValue={editProduct.qty} className="input" />
                <input name="reorderPoint" type="number" step={qtyStep(editProduct)} min="0" defaultValue={editProduct.reorderPoint} className="input" />
              </div>
              <input name="sku" placeholder="SKU / Barcode" defaultValue={editProduct.sku ?? ''} className="input" />
              <input name="expiryDate" type="date" defaultValue={editProduct.expiryDate ?? ''} className="input" />
              <p className="text-muted text-xs -mt-1">Expiry date (for perishables)</p>
              {storeVatRegistered && (
                <>
                  <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--foreground)' }}>Price includes VAT</span>
                    <input
                      type="checkbox"
                      name="vatInclusive"
                      defaultChecked={editProduct.vatInclusive ?? true}
                      className="w-5 h-5 accent-brand"
                    />
                  </label>
                  <div>
                    <label className="text-muted text-xs ml-1 mb-1 block">VAT category</label>
                    <select name="vatCode" defaultValue={editProduct.vatCode ?? 'standard'} className="input">
                      <option value="standard">Standard 15%</option>
                      <option value="zero">Zero-rated (bread, milk, maize, etc.)</option>
                      <option value="exempt">Exempt</option>
                    </select>
                    <p className="text-muted text-[10px] mt-1 ml-1">Drives the VAT201 worksheet split — zero-rated and exempt items contribute revenue but no output VAT.</p>
                  </div>
                </>
              )}
              <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                <div>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>Airtime voucher</p>
                  <p className="text-muted text-[10px] mt-0.5">Each sale dispenses a pre-loaded PIN from /airtime</p>
                </div>
                <input
                  type="checkbox"
                  name="isAirtime"
                  defaultChecked={editProduct.isAirtime ?? false}
                  className="w-5 h-5 accent-brand"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                <div>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>Combo bundle</p>
                  <p className="text-muted text-[10px] mt-0.5">Selling decrements stock from chosen components — manage on /bundles</p>
                </div>
                <input
                  type="checkbox"
                  name="isBundle"
                  defaultChecked={editProduct.isBundle ?? false}
                  className="w-5 h-5 accent-brand"
                />
              </label>
              {editProduct.isBundle && (
                <a href={`/bundles/${editProduct.id}`} className="text-brand text-sm font-semibold ml-1">
                  → Manage components
                </a>
              )}
              <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                <div>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>Weighable</p>
                  <p className="text-muted text-[10px] mt-0.5">Sell by weight or volume — price is per the chosen unit.</p>
                </div>
                <input
                  type="checkbox"
                  name="isWeighable"
                  defaultChecked={editProduct.isWeighable ?? false}
                  className="w-5 h-5 accent-brand"
                />
              </label>
              <div>
                <label className="text-muted text-xs ml-1 mb-1 block">Unit</label>
                <select name="unitLabel" defaultValue={editProduct.unitLabel ?? 'each'} className="input">
                  {PRODUCT_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label} ({u.value})</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={isPending} className="btn-primary mt-2">{isPending ? 'Saving…' : 'Save Changes'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Waste sheet */}
      {wasteId && wasteProduct && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setWasteId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Record waste</h2>
            <p className="text-muted text-sm mb-1">{wasteProduct.name}</p>
            <p className="text-muted text-xs mb-4">Available: {wasteProduct.qty} · Cost per unit: R{(wasteProduct.cost ?? 0).toFixed(2)}</p>
            <form action={handleWaste} className="flex flex-col gap-3">
              <input type="hidden" name="productId" value={wasteId} />
              <div>
                <label className="text-muted text-xs ml-1 mb-1 block">Qty wasted *</label>
                <input
                  name="qty"
                  type="number"
                  step={qtyStep(wasteProduct)}
                  min={qtyStep(wasteProduct)}
                  max={wasteProduct.qty}
                  required
                  autoFocus
                  className="input"
                  onInput={(e) => {
                    // Clamp paste / manual typing so the form can't submit a value
                    // higher than available stock. Browser `max` only enforces nudge buttons.
                    const el = e.currentTarget
                    const n = parseFloat(el.value)
                    if (Number.isFinite(n) && n > wasteProduct.qty) el.value = String(wasteProduct.qty)
                  }}
                />
              </div>
              <div>
                <label className="text-muted text-xs ml-1 mb-1 block">Reason</label>
                <select name="reason" defaultValue="expired" className="input">
                  {WASTAGE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <input name="notes" placeholder="Notes (optional)" className="input" />
              <p className="text-muted text-xs -mt-1 ml-1">Decrements stock and captures cost-at-loss for P&amp;L. No revenue recorded.</p>
              <button type="submit" disabled={isPending} className="btn-primary mt-2" style={{ background: '#F59E0B', color: '#0A0E17' }}>
                {isPending ? 'Saving…' : 'Record Waste'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV import sheet */}
      {showImport && (
        <ImportSheet
          isPending={isPending}
          result={importResult}
          onClose={() => { setShowImport(false); setImportResult(null) }}
          onImport={handleImport}
          onDownloadSample={downloadSampleCsv}
        />
      )}

      {/* Barcode scanner */}
      {showScanner && (
        <BarcodeScanner onScan={onBarcodeScan} onClose={() => setShowScanner(false)} />
      )}
    </>
  )
}

function ImportSheet({
  isPending,
  result,
  onClose,
  onImport,
  onDownloadSample,
}: {
  isPending: boolean
  result: CsvImportResult | null
  onClose: () => void
  onImport: (csv: string) => void
  onDownloadSample: () => void
}) {
  const [csvText, setCsvText] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCsvText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative rounded-t-3xl p-6 pb-24 sheet max-h-[88vh] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Import products from CSV</h2>
        <p className="text-muted text-sm mb-4">
          Required columns: <code>name</code>, <code>price</code>. Optional: <code>cost</code>, <code>qty</code>, <code>reorder_point</code>, <code>sku</code>.
        </p>

        <button onClick={onDownloadSample} className="text-brand text-sm font-semibold mb-4">↓ Download template CSV</button>

        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm mb-3 text-muted"
        />

        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder="…or paste CSV content here"
          rows={6}
          className="input font-mono text-xs"
        />

        {result && (
          <div className="card p-3 mt-3" style={result.errors.length > 0 ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>
              ✓ {result.imported} imported{result.skipped ? `, ${result.skipped} failed` : ''}
            </p>
            {result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-muted">{result.errors.length} parse error{result.errors.length === 1 ? '' : 's'}</summary>
                <ul className="text-xs text-danger mt-2 space-y-0.5">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>Line {e.line}: {e.message}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <button
          onClick={() => csvText.trim() && onImport(csvText)}
          disabled={isPending || !csvText.trim()}
          className="btn-primary mt-4"
          style={{ opacity: isPending || !csvText.trim() ? 0.5 : 1 }}
        >
          {isPending ? 'Importing…' : 'Import'}
        </button>
      </div>
    </div>
  )
}

