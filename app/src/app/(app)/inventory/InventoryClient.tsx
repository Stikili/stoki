'use client'

import { useState, useTransition, useMemo } from 'react'
import { ProductWithStatus } from '@/domain/entities/product'
import { addProductAction, restockAction, editProductAction, archiveProductAction } from './actions'
import { useToast } from '@/components/Toast'

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

export default function InventoryClient({ products }: { products: ProductWithStatus[] }) {
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const editProduct = products.find((p) => p.id === editId)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter((p) => {
      const matchesFilter = filter === 'all' ? true : filter === 'low' ? p.status === 'low' : p.status === 'out'
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [products, filter, search])

  function handleAddProduct(formData: FormData) {
    startTransition(async () => {
      await addProductAction(formData)
      setShowAdd(false)
      toast('Product added')
    })
  }

  function handleRestock(formData: FormData) {
    startTransition(async () => {
      await restockAction(formData)
      setRestockId(null)
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

  function handleArchive(p: ProductWithStatus) {
    if (!confirm(`Archive "${p.name}"? It won't appear in sales but history is preserved.`)) return
    startTransition(async () => {
      await archiveProductAction(p.id)
      toast(`"${p.name}" archived`, 'info')
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Stock</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-gloss w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
          style={{
            background: 'linear-gradient(135deg, #00C896, #00a87e)',
            boxShadow: '0 0 20px rgba(0,200,150,0.4), 0 1px 0 rgba(255,255,255,0.25) inset',
            color: '#080f1a',
          }}
        >
          +
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products or SKU…"
          style={{ ...inputStyle, paddingLeft: '40px' }}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'low', 'out'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
            style={filter === f ? {
              background: 'linear-gradient(135deg, #00C896, #00a87e)',
              color: '#080f1a',
              boxShadow: '0 0 14px rgba(0,200,150,0.3)',
            } : {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#5a7a94',
            }}
          >
            {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
          </button>
        ))}
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={cardStyle}>
            <span className="text-3xl">📦</span>
          </div>
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
            return (
              <div key={p.id} className="rounded-2xl p-4" style={cardStyle}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{p.name}</p>
                    {p.sku && <p className="text-muted text-xs mt-0.5">SKU: {p.sku}</p>}
                  </div>
                  <span
                    className="ml-3 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                    style={{ background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}
                  >
                    {statusLabel[p.status]}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  <span className="text-white font-bold">R{p.price.toFixed(2)}</span>
                  <span className="text-muted text-sm">{p.qty} left</span>
                  <span className="text-muted text-xs">+R{p.margin.toFixed(2)}</span>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => setRestockId(p.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
                    >
                      Restock
                    </button>
                    <button
                      onClick={() => setEditId(p.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Edit
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
            <h2 className="text-lg font-bold text-white mb-5">Add Product</h2>
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
              <input name="sku" placeholder="SKU (optional)" style={inputStyle} />
              <button type="submit" disabled={isPending} style={{ ...primaryBtn, marginTop: '8px', opacity: isPending ? 0.6 : 1 }}>
                {isPending ? 'Adding…' : 'Add Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Restock sheet */}
      {restockId && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setRestockId(null)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-1">Restock</h2>
            <p className="text-muted text-sm mb-5">{products.find((p) => p.id === restockId)?.name}</p>
            <form action={handleRestock} className="flex flex-col gap-3">
              <input type="hidden" name="productId" value={restockId} />
              <input name="qty" type="number" min="1" placeholder="Units to add *" required autoFocus style={inputStyle} />
              <button type="submit" disabled={isPending} style={{ ...primaryBtn, opacity: isPending ? 0.6 : 1 }}>
                {isPending ? 'Saving…' : 'Add Stock'}
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
              <h2 className="text-lg font-bold text-white">Edit Product</h2>
              <button
                onClick={() => handleArchive(editProduct)}
                disabled={isPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                Archive
              </button>
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
              <input name="sku" placeholder="SKU (optional)" defaultValue={editProduct.sku ?? ''} style={inputStyle} />
              <button type="submit" disabled={isPending} style={{ ...primaryBtn, marginTop: '8px', opacity: isPending ? 0.6 : 1 }}>
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
