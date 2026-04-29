'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { ProductWithStatus } from '@/domain/entities/product'
import { addProductAction, restockAction, editProductAction, archiveProductAction } from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import VoiceInput from '@/components/VoiceInput'
import { ScanBarcode, Plus, Search } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

type Filter = 'all' | 'low' | 'out'
const statusPill = { ok: 'pill-green', low: 'pill-yellow', out: 'pill-red' }
const statusText = { ok: 'In Stock', low: 'Low', out: 'Out' }

export default function InventoryClient({ products, salesVelocity }: { products: ProductWithStatus[]; salesVelocity?: Record<string, number> }) {
  const { toast, toastUndo } = useToast()
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [isPending, startTransition] = useTransition()

  const editProduct = products.find(p => p.id === editId)
  const restockProduct = products.find(p => p.id === restockId)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter(p => {
      if (filter === 'low' && p.status !== 'low') return false
      if (filter === 'out' && p.status !== 'out') return false
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [products, filter, search])

  function getSuggestion(id: string) { const r = salesVelocity?.[id]; return r && r >= 0.1 ? Math.ceil(r * 7) : null }

  function handleAdd(fd: FormData) { startTransition(async () => { await addProductAction(fd); setShowAdd(false); haptic(30); toast('Product added') }) }
  function handleRestock(fd: FormData) { startTransition(async () => { await restockAction(fd); setRestockId(null); haptic(30); toast('Stock updated') }) }
  function handleEdit(fd: FormData) { startTransition(async () => { await editProductAction(fd); setEditId(null); toast('Product updated') }) }

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

  function onBarcodeScan(code: string) { setShowScanner(false); setSearch(code); const m = products.find(p => p.sku === code); toast(m ? `Found: ${m.name}` : `No SKU "${code}"`, m ? 'info' : 'error') }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">{t('inventory.stock')}</h1>
        <div className="flex gap-2">
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

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {(['all','low','out'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={filter === f ? { background: '#00C896', color: '#0A0E17' } : { background: '#141B2D', color: '#8896AB' }}>
            {f === 'all' ? t('inventory.all') : f === 'low' ? t('inventory.lowStock') : t('inventory.outOfStock')}
          </button>
        ))}
      </div>

      {/* Products */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted py-16">{products.length === 0 ? 'No products yet — tap + to add' : search ? 'No matches' : 'None in this category'}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(p => {
            const sug = getSuggestion(p.id)
            const daysLeft = p.expiryDate ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000) : null
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
                  <span className="text-white font-bold">R{p.price.toFixed(2)}</span>
                  <span className="text-muted text-sm">{p.qty} left</span>
                  <span className="text-muted text-xs">+R{p.margin.toFixed(2)}</span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => setRestockId(p.id)} className="pill pill-blue min-h-0 text-xs">{t('inventory.restock')}</button>
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
            <h2 className="text-lg font-bold text-white mb-1">Restock</h2>
            <p className="text-muted text-sm mb-5">{restockProduct.name}</p>
            {getSuggestion(restockId) && <p className="pill pill-blue text-xs mb-4">Suggested: {getSuggestion(restockId)} units</p>}
            <form action={handleRestock} className="flex flex-col gap-3">
              <input type="hidden" name="productId" value={restockId} />
              <input name="qty" type="number" min="1" placeholder="Units to add *" required autoFocus defaultValue={getSuggestion(restockId) ?? undefined} className="input" />
              <button type="submit" disabled={isPending} className="btn-primary">{isPending ? 'Saving…' : 'Add Stock'}</button>
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
                <input name="qty" type="number" min="0" defaultValue={editProduct.qty} className="input" />
                <input name="reorderPoint" type="number" min="0" defaultValue={editProduct.reorderPoint} className="input" />
              </div>
              <input name="sku" placeholder="SKU / Barcode" defaultValue={editProduct.sku ?? ''} className="input" />
              <input name="expiryDate" type="date" defaultValue={editProduct.expiryDate ?? ''} className="input" />
              <p className="text-muted text-xs -mt-1">Expiry date (for perishables)</p>
              <button type="submit" disabled={isPending} className="btn-primary mt-2">{isPending ? 'Saving…' : 'Save Changes'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Barcode scanner */}
      {showScanner && (
        <BarcodeScanner onScan={onBarcodeScan} onClose={() => setShowScanner(false)} />
      )}
    </>
  )
}

function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const scannerInstance = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const [manualSku, setManualSku] = useState('')

  useEffect(() => {
    let mounted = true

    async function start() {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mounted || !scannerRef.current) return

      const scanner = new Html5Qrcode('barcode-reader')
      scannerInstance.current = scanner

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 120 }, aspectRatio: 1.0 },
          (text) => {
            scanner.stop().catch(() => {})
            onScan(text)
          },
          () => {} // ignore errors during scanning
        )
      } catch {
        // Camera not available — user can type manually
      }
    }

    start()

    return () => {
      mounted = false
      scannerInstance.current?.stop().catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: 'var(--background)' }}>
      <div className="flex items-center justify-between p-4">
        <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Scan Barcode</h2>
        <button onClick={onClose} className="text-2xl w-10 h-10 flex items-center justify-center" style={{ color: 'var(--foreground)' }}>×</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div id="barcode-reader" ref={scannerRef} className="w-full max-w-sm rounded-2xl overflow-hidden" />
        <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>Point camera at any barcode</p>

        {/* Manual fallback */}
        <div className="w-full max-w-sm mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Or type SKU</p>
          <div className="flex gap-2">
            <input
              value={manualSku}
              onChange={e => setManualSku(e.target.value)}
              placeholder="Enter barcode / SKU"
              className="input flex-1"
              onKeyDown={e => { if (e.key === 'Enter' && manualSku.trim()) { scannerInstance.current?.stop().catch(() => {}); onScan(manualSku.trim()) } }}
            />
            <button
              onClick={() => { if (manualSku.trim()) { scannerInstance.current?.stop().catch(() => {}); onScan(manualSku.trim()) } }}
              disabled={!manualSku.trim()}
              className="btn-primary"
              style={{ width: 'auto', padding: '14px 20px', opacity: manualSku.trim() ? 1 : 0.5 }}
            >
              Go
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
