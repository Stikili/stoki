'use client'

import { useState, useTransition, useMemo } from 'react'
import { ProductWithStatus } from '@/domain/entities/product'
import { addProductAction, restockAction, editProductAction, archiveProductAction } from './actions'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptic'
import VoiceInput from '@/components/VoiceInput'

const statusStyle = {
  ok:  { bg: 'rgba(0,200,150,0.12)',  border: 'rgba(0,200,150,0.3)',  text: '#00C896' },
  low: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
  out: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#ef4444' },
}
const statusLabel = { ok: 'In Stock', low: 'Low', out: 'Out' }

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
}

const primaryBtn = {
  background: 'linear-gradient(135deg, #00C896 0%, #00a87e 100%)',
  boxShadow: '0 0 24px rgba(0,200,150,0.35), 0 1px 0 rgba(255,255,255,0.2) inset',
  borderRadius: '14px',
  padding: '14px',
  color: '#080f1a',
  fontWeight: 700,
  fontSize: '15px',
  width: '100%',
}

type Filter = 'all' | 'low' | 'out'

export default function InventoryClient({
  products,
  salesVelocity,
}: {
  products: ProductWithStatus[]
  salesVelocity?: Record<string, number> // productId → avg daily sales (7d)
}) {
  const { toast, toastUndo } = useToast()
  const { t } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showScanner, setShowScanner] = useState(false)

  const editProduct = products.find((p) => p.id === editId)
  const restockProduct = products.find((p) => p.id === restockId)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter((p) => {
      const matchesFilter = filter === 'all' ? true : filter === 'low' ? p.status === 'low' : p.status === 'out'
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [products, filter, search])

  // Smart restock suggestion
  function getRestockSuggestion(productId: string): number | null {
    if (!salesVelocity) return null
    const dailyRate = salesVelocity[productId]
    if (!dailyRate || dailyRate < 0.1) return null
    return Math.ceil(dailyRate * 7) // 1 week of stock
  }

  function handleAddProduct(formData: FormData) {
    startTransition(async () => {
      await addProductAction(formData)
      setShowAdd(false)
      haptic(30)
      toast('Product added')
    })
  }

  function handleRestock(formData: FormData) {
    startTransition(async () => {
      await restockAction(formData)
      setRestockId(null)
      haptic(30)
      toast('Stock updated')
    })
  }

  function handleEdit(formData: FormData) {
    startTransition(async () => {
      await editProductAction(formData)
      setEditId(null)
      toast('Product updated')
    })
  }

  // Undo-able archive
  function handleArchive(p: ProductWithStatus) {
    haptic(50)
    setEditId(null)
    startTransition(async () => {
      await archiveProductAction(p.id)
      toastUndo(`"${p.name}" archived`, () => {
        // Re-add with same data (best-effort undo)
        const fd = new FormData()
        fd.set('name', p.name)
        fd.set('price', String(p.price))
        fd.set('cost', String(p.cost ?? 0))
        fd.set('qty', String(p.qty))
        fd.set('reorderPoint', String(p.reorderPoint))
        if (p.sku) fd.set('sku', p.sku)
        startTransition(() => addProductAction(fd))
      })
    })
  }

  // Barcode scan result
  function onBarcodeScan(code: string) {
    setShowScanner(false)
    setSearch(code)
    const match = products.find((p) => p.sku === code)
    if (match) {
      toast(`Found: ${match.name}`, 'info')
    } else {
      toast(`No product with SKU "${code}"`, 'error')
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">{t('inventory.stock')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            aria-label="Scan barcode"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5a7a94" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/><line x1="15" y1="8" x2="15" y2="16"/></svg>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-gloss w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg"
            style={{ background: 'linear-gradient(135deg, #00C896, #00a87e)', boxShadow: '0 0 20px rgba(0,200,150,0.4), 0 1px 0 rgba(255,255,255,0.25) inset', color: '#080f1a' }}
          >+</button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('inventory.search')} style={{ ...inputStyle, paddingLeft: '40px' }} />
        </div>
        <VoiceInput onResult={setSearch} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'low', 'out'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
            style={filter === f
              ? { background: 'linear-gradient(135deg, #00C896, #00a87e)', color: '#080f1a', boxShadow: '0 0 14px rgba(0,200,150,0.3)' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#5a7a94' }
            }>
            {f === 'all' ? t('inventory.all') : f === 'low' ? t('inventory.lowStock') : t('inventory.outOfStock')}
          </button>
        ))}
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={cardStyle}><span className="text-3xl">📦</span></div>
          <p className="text-white font-semibold mb-1">
            {products.length === 0 ? 'No products yet' : search ? 'No matches' : 'None in this category'}
          </p>
          <p className="text-muted text-sm">
            {products.length === 0 ? 'Tap + to add your first product' : search ? 'Try a different search' : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((p) => {
            const ss = statusStyle[p.status]
            const suggestion = getRestockSuggestion(p.id)
            return (
              <div key={p.id} className="rounded-2xl p-4" style={cardStyle}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{p.name}</p>
                    {p.sku && <p className="text-muted text-xs mt-0.5">SKU: {p.sku}</p>}
                    {p.expiryDate && (() => {
                      const daysLeft = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000)
                      if (daysLeft <= 0) return <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>Expired!</p>
                      if (daysLeft <= 7) return <p className="text-xs mt-0.5" style={{ color: '#f59e0b' }}>Expires in {daysLeft}d</p>
                      return null
                    })()}
                  </div>
                  <span className="ml-3 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0" style={{ background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                    {statusLabel[p.status]}
                  </span>
                </div>
                {/* Smart restock suggestion */}
                {suggestion && (p.status === 'low' || p.status === 'out') && (
                  <p className="text-xs mb-2 px-2.5 py-1.5 rounded-lg inline-block" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}>
                    {t('inventory.smartRestock', { qty: String(suggestion) })}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  <span className="text-white font-bold">R{p.price.toFixed(2)}</span>
                  <span className="text-muted text-sm">{p.qty} left</span>
                  <span className="text-muted text-xs">+R{p.margin.toFixed(2)}</span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => setRestockId(p.id)} className="text-xs font-semibold px-4 py-2 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {t('inventory.restock')}
                    </button>
                    <button onClick={() => setEditId(p.id)} className="text-xs font-semibold px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {t('inventory.edit')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Product sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAdd(false)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-5">{t('inventory.addProduct')}</h2>
            <form action={handleAddProduct} className="flex flex-col gap-3">
              <input name="name" placeholder="Product name *" required style={inputStyle} />
              <div className="grid grid-cols-2 gap-3">
                <input name="price" type="number" step="0.01" min="0" placeholder="Price (R) *" required style={inputStyle} />
                <input name="cost" type="number" step="0.01" min="0" placeholder="Cost (R)" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input name="qty" type="number" min="0" placeholder="Qty in stock" defaultValue="0" style={inputStyle} />
                <input name="reorderPoint" type="number" min="0" placeholder="Reorder at" defaultValue="5" style={inputStyle} />
              </div>
              <input name="sku" placeholder="SKU / Barcode (optional)" style={inputStyle} />
              <button type="submit" disabled={isPending} style={{ ...primaryBtn, marginTop: '8px', opacity: isPending ? 0.6 : 1 }}>
                {isPending ? t('common.adding') : t('inventory.addProduct')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Restock sheet */}
      {restockId && restockProduct && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setRestockId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-1">{t('inventory.restock')}</h2>
            <p className="text-muted text-sm mb-5">{restockProduct.name}</p>
            {getRestockSuggestion(restockId) && (
              <p className="text-xs mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}>
                {t('inventory.smartRestock', { qty: String(getRestockSuggestion(restockId)) })}
              </p>
            )}
            <form action={handleRestock} className="flex flex-col gap-3">
              <input type="hidden" name="productId" value={restockId} />
              <input name="qty" type="number" min="1" placeholder="Units to add *" required autoFocus defaultValue={getRestockSuggestion(restockId) ?? undefined} style={inputStyle} />
              <button type="submit" disabled={isPending} style={{ ...primaryBtn, opacity: isPending ? 0.6 : 1 }}>
                {isPending ? t('common.saving') : t('inventory.restock')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product sheet */}
      {editId && editProduct && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{t('inventory.edit')}</h2>
              <button onClick={() => handleArchive(editProduct)} disabled={isPending} className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>{t('inventory.archive')}</button>
            </div>
            <form action={handleEdit} className="flex flex-col gap-3">
              <input type="hidden" name="productId" value={editId} />
              <input name="name" placeholder="Product name *" required defaultValue={editProduct.name} style={inputStyle} />
              <div className="grid grid-cols-2 gap-3">
                <input name="price" type="number" step="0.01" min="0" placeholder="Price (R) *" required defaultValue={editProduct.price} style={inputStyle} />
                <input name="cost" type="number" step="0.01" min="0" placeholder="Cost (R)" defaultValue={editProduct.cost ?? ''} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input name="qty" type="number" min="0" placeholder="Qty in stock" defaultValue={editProduct.qty} style={inputStyle} />
                <input name="reorderPoint" type="number" min="0" placeholder="Reorder at" defaultValue={editProduct.reorderPoint} style={inputStyle} />
              </div>
              <input name="sku" placeholder="SKU / Barcode (optional)" defaultValue={editProduct.sku ?? ''} style={inputStyle} />
              <input name="expiryDate" type="date" defaultValue={editProduct.expiryDate ?? ''} style={inputStyle} />
              <p className="text-muted text-xs -mt-1 ml-1">Expiry date (for perishables)</p>
              <button type="submit" disabled={isPending} style={{ ...primaryBtn, marginTop: '8px', opacity: isPending ? 0.6 : 1 }}>
                {isPending ? t('common.saving') : t('common.save')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barcode scanner overlay */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-white font-bold">Scan Barcode</h2>
            <button onClick={() => setShowScanner(false)} className="text-white text-2xl w-10 h-10 flex items-center justify-center">×</button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <BarcodeScanner onScan={onBarcodeScan} onClose={() => setShowScanner(false)} />
          </div>
        </div>
      )}
    </>
  )
}

// Lightweight barcode scanner using BarcodeDetector API
function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const videoRef = useState<HTMLVideoElement | null>(null)

  // Use useEffect indirectly via a ref callback
  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef[1](el)
    if (!el) return

    // Check for BarcodeDetector API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BD = (window as any).BarcodeDetector
    if (!BD) {
      // Fallback: manual SKU entry
      const sku = prompt('Barcode scanner not supported in this browser. Enter SKU manually:')
      if (sku) onScan(sku)
      else onClose()
      return
    }

    const detector = new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] })
    let stopped = false

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        el.srcObject = stream
        el.play()

        const interval = setInterval(async () => {
          if (stopped) return
          try {
            const barcodes = await detector.detect(el)
            if (barcodes.length > 0) {
              stopped = true
              clearInterval(interval)
              stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
              onScan(barcodes[0].rawValue)
            }
          } catch { /* ignore detection errors */ }
        }, 300)

        // Cleanup on unmount
        el.addEventListener('pause', () => { stopped = true; clearInterval(interval) }, { once: true })
      })
      .catch(() => {
        onClose()
      })
  }

  return (
    <div className="relative">
      <video ref={setVideoRef} className="w-80 h-60 rounded-2xl object-cover" playsInline muted />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-16 border-2 border-brand rounded-lg" style={{ boxShadow: '0 0 20px rgba(0,200,150,0.3)' }} />
      </div>
      <p className="text-muted text-xs text-center mt-3">Point camera at barcode</p>
    </div>
  )
}
