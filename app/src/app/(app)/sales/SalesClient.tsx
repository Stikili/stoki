'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { ProductWithStatus } from '@/domain/entities/product'
import { Sale } from '@/domain/entities/sale'
import { recordCartAction, getSalesByDateAction } from './actions'
import { useToast } from '@/components/Toast'

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
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function toLocalDateString(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface CartItem {
  product: ProductWithStatus
  qty: number
}

export default function SalesClient({
  products,
  todaySales,
}: {
  products: ProductWithStatus[]
  todaySales: Sale[]
}) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'sell' | 'history'>('sell')

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [selling, setSelling] = useState<ProductWithStatus | null>(null)
  const [qtyForSelling, setQtyForSelling] = useState(1)

  // History state
  const today = toLocalDateString(new Date())
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [historySales, setHistorySales] = useState<Sale[]>(todaySales)
  const [historyLoading, setHistoryLoading] = useState(false)

  const available = products.filter((p) => p.qty > 0)
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  // Compute in-stock remaining accounting for cart
  const cartMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const item of cart) m[item.product.id] = item.qty
    return m
  }, [cart])

  function openSell(p: ProductWithStatus) {
    setQtyForSelling(1)
    setSelling(p)
  }

  function addToCart() {
    if (!selling) return
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === selling.id)
      if (existing) {
        return prev.map((i) => i.product.id === selling.id ? { ...i, qty: i.qty + qtyForSelling } : i)
      }
      return [...prev, { product: selling, qty: qtyForSelling }]
    })
    setSelling(null)
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function confirmCart() {
    if (cart.length === 0 || isPending) return
    startTransition(async () => {
      await recordCartAction(cart.map((i) => ({
        productId: i.product.id,
        qty: i.qty,
        priceAtSale: i.product.price,
      })))
      toast(`Sale recorded — R${cartTotal.toFixed(2)}`)
      setCart([])
    })
  }

  const loadHistory = useCallback((from: string, to: string) => {
    setHistoryLoading(true)
    const fromDt = new Date(from)
    fromDt.setHours(0, 0, 0, 0)
    const toDt = new Date(to)
    toDt.setHours(23, 59, 59, 999)
    startTransition(async () => {
      const sales = await getSalesByDateAction(fromDt.toISOString(), toDt.toISOString())
      setHistorySales(sales)
      setHistoryLoading(false)
    })
  }, [])

  function exportCSV() {
    const rows = [
      ['Date', 'Time', 'Product', 'Qty', 'Price', 'Total'],
      ...historySales.map((s) => [
        fmtDate(s.recordedAt),
        fmtTime(s.recordedAt),
        s.productName ?? '',
        String(s.qty),
        s.priceAtSale.toFixed(2),
        (s.priceAtSale * s.qty).toFixed(2),
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales_${fromDate}_to_${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV downloaded', 'info')
  }

  const historyTotal = historySales.reduce((s, sale) => s + sale.priceAtSale * sale.qty, 0)

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['sell', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-all capitalize"
            style={tab === t
              ? { background: 'linear-gradient(135deg, #00C896, #00a87e)', color: '#080f1a', boxShadow: '0 0 14px rgba(0,200,150,0.3)' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#5a7a94' }
            }
          >
            {t === 'sell' ? `Sell${cartCount > 0 ? ` (${cartCount})` : ''}` : 'History'}
          </button>
        ))}
      </div>

      {tab === 'sell' && (
        <>
          {/* Cart summary bar */}
          {cart.length > 0 && (
            <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between gap-3" style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-brand font-bold text-sm">Cart · R{cartTotal.toFixed(2)}</p>
                <p className="text-muted text-xs mt-0.5 truncate">
                  {cart.map((i) => `${i.qty}× ${i.product.name}`).join(', ')}
                </p>
              </div>
              <button
                onClick={confirmCart}
                disabled={isPending}
                className="text-sm font-bold px-4 py-2 rounded-xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #00C896, #00a87e)', color: '#080f1a', opacity: isPending ? 0.6 : 1 }}
              >
                {isPending ? 'Saving…' : 'Charge →'}
              </button>
            </div>
          )}

          {/* Cart items */}
          {cart.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)' }}>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm font-semibold truncate">{item.product.name}</span>
                    <span className="text-muted text-xs ml-2">{item.qty}× R{item.product.price.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-muted text-lg ml-3 w-8 h-8 flex items-center justify-center rounded-full"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {available.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={cardStyle}>
                <span className="text-3xl">💰</span>
              </div>
              <p className="text-white font-semibold mb-1">{products.length === 0 ? 'No products yet' : 'All out of stock'}</p>
              <p className="text-muted text-sm">{products.length === 0 ? 'Add stock first' : 'Restock to sell'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {available.map((p) => {
                const inCart = cartMap[p.id] ?? 0
                const remaining = p.qty - inCart
                return (
                  <button
                    key={p.id}
                    onClick={() => remaining > 0 && openSell(p)}
                    disabled={remaining <= 0}
                    className="w-full text-left rounded-2xl p-4 active:scale-[0.97] transition-transform relative overflow-hidden"
                    style={{ ...cardStyle, opacity: remaining <= 0 ? 0.4 : 1 }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none rounded-t-2xl" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)' }} />
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{p.name}</p>
                        <p className="text-muted text-sm mt-0.5">{remaining} available{inCart > 0 ? ` (${inCart} in cart)` : ''}</p>
                      </div>
                      <div className="ml-4 text-right flex-shrink-0">
                        <p className="font-bold text-xl" style={{ background: 'linear-gradient(135deg, #00C896, #00e8b3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                          R{p.price.toFixed(2)}
                        </p>
                        <p className="text-muted text-xs mt-0.5">{remaining > 0 ? 'Tap to add' : 'In cart'}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {/* Date range picker */}
          <div className="rounded-2xl px-4 py-3 mb-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs w-8">From</span>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  loadHistory(e.target.value, toDate)
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs w-8">To</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={today}
                onChange={(e) => {
                  setToDate(e.target.value)
                  loadHistory(fromDate, e.target.value)
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <div className="flex gap-2">
              {(['Today', '7d', '30d'] as const).map((label) => {
                function setRange() {
                  const now = new Date()
                  const t = toLocalDateString(now)
                  let f = t
                  if (label === '7d') { const d = new Date(now); d.setDate(d.getDate() - 6); f = toLocalDateString(d) }
                  if (label === '30d') { const d = new Date(now); d.setDate(d.getDate() - 29); f = toLocalDateString(d) }
                  setFromDate(f); setToDate(t); loadHistory(f, t)
                }
                return (
                  <button key={label} onClick={setRange} className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#5a7a94', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Summary bar */}
          <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.15)' }}>
            <div>
              <span className="text-muted text-xs">{historySales.length} sale{historySales.length !== 1 ? 's' : ''}</span>
              <p className="text-brand font-bold text-lg">R{historyTotal.toFixed(2)}</p>
            </div>
            {historySales.length > 0 && (
              <button
                onClick={exportCSV}
                className="text-xs font-semibold px-3 py-2 rounded-xl"
                style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                Export CSV
              </button>
            )}
          </div>

          {historyLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-2xl" />
              ))}
            </div>
          ) : historySales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={cardStyle}>
                <span className="text-3xl">📋</span>
              </div>
              <p className="text-white font-semibold mb-1">No sales in this period</p>
              <p className="text-muted text-sm">Try a different date range</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {historySales.map((sale) => (
                <div key={sale.id} className="rounded-2xl px-4 py-3 flex items-center justify-between" style={cardStyle}>
                  <div>
                    <p className="text-white font-semibold text-sm">{sale.productName ?? 'Unknown product'}</p>
                    <p className="text-muted text-xs mt-0.5">{sale.qty} unit{sale.qty > 1 ? 's' : ''} · {fmtDate(sale.recordedAt)} {fmtTime(sale.recordedAt)}</p>
                  </div>
                  <p className="text-brand font-bold">R{(sale.priceAtSale * sale.qty).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add to cart sheet */}
      {selling && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelling(null)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-0.5">{selling.name}</h2>
            <p className="text-muted text-sm mb-6">R{selling.price.toFixed(2)} each · {selling.qty - (cartMap[selling.id] ?? 0)} available</p>

            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={() => setQtyForSelling((q) => Math.max(1, q - 1))}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              >−</button>
              <div className="text-center min-w-[60px]">
                <p className="text-5xl font-black text-white">{qtyForSelling}</p>
                <p className="text-muted text-xs mt-1">units</p>
              </div>
              <button
                onClick={() => setQtyForSelling((q) => Math.min(selling.qty - (cartMap[selling.id] ?? 0), q + 1))}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              >+</button>
            </div>

            <div className="rounded-2xl px-4 py-3 mb-5 flex items-center justify-between" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.15)' }}>
              <span className="text-muted text-sm">Subtotal</span>
              <span className="text-brand font-bold text-xl">R{(selling.price * qtyForSelling).toFixed(2)}</span>
            </div>

            <button
              onClick={addToCart}
              className="w-full relative overflow-hidden active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #00C896 0%, #00a87e 100%)', boxShadow: '0 0 28px rgba(0,200,150,0.4), 0 1px 0 rgba(255,255,255,0.25) inset', borderRadius: '14px', padding: '15px', color: '#080f1a', fontWeight: 700, fontSize: '16px' }}
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)', borderRadius: 'inherit' }} />
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </>
  )
}
