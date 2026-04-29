'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { ProductWithStatus } from '@/domain/entities/product'
import { Sale } from '@/domain/entities/sale'
import { recordCartAction, recordReturnAction, getSalesByDateAction } from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import Receipt from '@/components/Receipt'
import { useI18n } from '@/lib/i18n'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOfflineStore } from '@/lib/offline-store'

function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) }
function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

interface CartItem { product: ProductWithStatus; qty: number }

export default function SalesClient({ products, todaySales, storeName, topProducts = [] }: { products: ProductWithStatus[]; todaySales: Sale[]; storeName: string; topProducts?: ProductWithStatus[] }) {
  const { toast } = useToast()
  const { t } = useI18n()
  const { isOnline } = useOnlineStatus()
  const { queueSale } = useOfflineStore()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'sell' | 'history'>('sell')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selling, setSelling] = useState<ProductWithStatus | null>(null)
  const [qtyForSelling, setQtyForSelling] = useState(1)
  const [receipt, setReceipt] = useState<{ items: { name: string; qty: number; price: number }[]; total: number } | null>(null)
  const [returning, setReturning] = useState<Sale | null>(null)

  const today = toDateStr(new Date())
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [historySales, setHistorySales] = useState<Sale[]>(todaySales)
  const [historyLoading, setHistoryLoading] = useState(false)

  const available = products.filter((p) => p.qty > 0)
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartMap = useMemo(() => { const m: Record<string, number> = {}; for (const i of cart) m[i.product.id] = i.qty; return m }, [cart])

  function quickAdd(p: ProductWithStatus) {
    if (p.qty - (cartMap[p.id] ?? 0) <= 0) return
    haptic(30)
    setCart(prev => { const e = prev.find(i => i.product.id === p.id); return e ? prev.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { product: p, qty: 1 }] })
  }

  function confirmCart() {
    if (!cart.length || isPending) return
    haptic([50, 30, 50])
    const items = cart.map(i => ({ name: i.product.name, qty: i.qty, price: i.product.price }))
    const cartItems = cart.map(i => ({ productId: i.product.id, qty: i.qty, priceAtSale: i.product.price }))
    const total = cartTotal

    if (!isOnline) {
      queueSale(cartItems)
      setReceipt({ items, total })
      toast(t('offline.saleSaved'), 'info')
      setCart([])
      return
    }

    startTransition(async () => {
      await recordCartAction(cartItems)
      setReceipt({ items, total })
      toast(`Sale recorded — R${total.toFixed(2)}`)
      setCart([])
    })
  }

  const loadHistory = useCallback((f: string, t: string) => {
    setHistoryLoading(true)
    const from = new Date(f); from.setHours(0,0,0,0)
    const to = new Date(t); to.setHours(23,59,59,999)
    startTransition(async () => { setHistorySales(await getSalesByDateAction(from.toISOString(), to.toISOString())); setHistoryLoading(false) })
  }, [])

  function confirmReturn() {
    if (!returning || !returning.productId || isPending) return
    startTransition(async () => {
      await recordReturnAction(returning.productId!, returning.qty, returning.priceAtSale)
      toast(`Return recorded — R${(returning.priceAtSale * returning.qty).toFixed(2)}`, 'info')
      setReturning(null)
      loadHistory(fromDate, toDate)
    })
  }

  function exportCSV() {
    const rows = [['Date','Time','Product','Qty','Price','Total'], ...historySales.map(s => [fmtDate(s.recordedAt),fmtTime(s.recordedAt),s.productName??'',String(s.qty),s.priceAtSale.toFixed(2),(s.priceAtSale*s.qty).toFixed(2)])]
    const blob = new Blob([rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sales_${fromDate}_${toDate}.csv`; a.click()
    toast('CSV downloaded', 'info')
  }

  let holdTimer: ReturnType<typeof setTimeout> | null = null
  const historyTotal = historySales.reduce((s, sale) => s + sale.priceAtSale * sale.qty, 0)

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['sell', 'history'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={tab === tb ? { background: '#00C896', color: '#0A0E17' } : { background: '#141B2D', color: '#8896AB', border: '1px solid #1E293B' }}>
            {tb === 'sell' ? `${t('sales.sell')}${cartCount ? ` (${cartCount})` : ''}` : t('sales.history')}
          </button>
        ))}
      </div>

      {tab === 'sell' && (
        <>
          {/* Quick sell */}
          {topProducts.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Quick Sell</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {topProducts.map(p => {
                  const remaining = p.qty - (cartMap[p.id] ?? 0)
                  return (
                    <button key={p.id} onClick={() => remaining > 0 && quickAdd(p)} disabled={remaining <= 0}
                      className="flex-shrink-0 card px-4 py-3 active:scale-[0.96] transition-transform min-w-[100px] text-left"
                      style={{ opacity: remaining <= 0 ? 0.3 : 1 }}>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{p.name}</p>
                      <p className="text-brand font-bold mt-1">R{p.price.toFixed(2)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cart bar */}
          {cart.length > 0 && (
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{t('sales.cart')} · R{cartTotal.toFixed(2)}</p>
                  <p className="text-muted text-xs mt-0.5 truncate">{cart.map(i => `${i.qty}× ${i.product.name}`).join(', ')}</p>
                </div>
                <button onClick={confirmCart} disabled={isPending}
                  className="text-sm font-bold px-5 py-2.5 rounded-xl flex-shrink-0 min-h-0"
                  style={{ background: '#00C896', color: '#0A0E17', opacity: isPending ? 0.5 : 1 }}>
                  {isPending ? t('common.saving') : `${t('sales.charge')} →`}
                </button>
              </div>
              {/* Cart items */}
              <div className="flex flex-col gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid #1E293B' }}>
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between">
                    <span className="text-white text-sm">{item.qty}× {item.product.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted text-sm">R{(item.product.price * item.qty).toFixed(2)}</span>
                      <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs min-h-0"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product list */}
          {available.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-white font-semibold mb-1">{products.length === 0 ? t('sales.noProducts') : t('sales.outOfStock')}</p>
              <p className="text-muted text-sm">{products.length === 0 ? t('inventory.addProduct') : t('inventory.restock')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {available.map(p => {
                const inCart = cartMap[p.id] ?? 0, remaining = p.qty - inCart
                return (
                  <button key={p.id} onClick={() => remaining > 0 && quickAdd(p)}
                    onContextMenu={e => { e.preventDefault(); setQtyForSelling(1); setSelling(p) }}
                    onTouchStart={() => { holdTimer = setTimeout(() => { holdTimer = null; setQtyForSelling(1); setSelling(p) }, 500) }}
                    onTouchEnd={() => holdTimer && clearTimeout(holdTimer)}
                    onTouchMove={() => holdTimer && (clearTimeout(holdTimer), holdTimer = null)}
                    disabled={remaining <= 0}
                    className="card p-4 w-full text-left flex items-center justify-between active:scale-[0.98] transition-transform"
                    style={{ opacity: remaining <= 0 ? 0.3 : 1 }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{p.name}</p>
                      <p className="text-muted text-sm mt-0.5">{remaining} left{inCart > 0 ? ` · ${inCart} in cart` : ''}</p>
                    </div>
                    <div className="ml-4 text-right flex-shrink-0">
                      <p className="text-brand font-bold text-lg">R{p.price.toFixed(2)}</p>
                      <p className="text-muted text-[11px]">Tap +1 · Hold more</p>
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
          <div className="card p-4 mb-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs w-10">From</span>
              <input type="date" value={fromDate} max={toDate} onChange={e => { setFromDate(e.target.value); loadHistory(e.target.value, toDate) }} className="input flex-1" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs w-10">To</span>
              <input type="date" value={toDate} min={fromDate} max={today} onChange={e => { setToDate(e.target.value); loadHistory(fromDate, e.target.value) }} className="input flex-1" />
            </div>
            <div className="flex gap-2">
              {(['Today','7d','30d'] as const).map(label => (
                <button key={label} onClick={() => {
                  const n = new Date(), t2 = toDateStr(n); let f = t2
                  if (label==='7d') { const d = new Date(n); d.setDate(d.getDate()-6); f = toDateStr(d) }
                  if (label==='30d') { const d = new Date(n); d.setDate(d.getDate()-29); f = toDateStr(d) }
                  setFromDate(f); setToDate(t2); loadHistory(f, t2)
                }} className="text-xs font-semibold px-3 py-2 rounded-lg min-h-0" style={{ background: '#1A2236', color: '#8896AB' }}>{label}</button>
              ))}
            </div>
          </div>

          <div className="card p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-muted text-xs">{historySales.length} sale{historySales.length !== 1 ? 's' : ''}</p>
              <p className="text-white font-bold text-lg">R{historyTotal.toFixed(2)}</p>
            </div>
            {historySales.length > 0 && (
              <button onClick={exportCSV} className="text-xs font-semibold px-4 py-2.5 rounded-xl min-h-0 pill-blue">Export CSV</button>
            )}
          </div>

          {historyLoading ? (
            <div className="flex flex-col gap-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
          ) : historySales.length === 0 ? (
            <p className="text-center text-muted py-12">{t('sales.noSales')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {historySales.map(sale => (
                <div key={sale.id} className="card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{sale.productName ?? 'Unknown'}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {sale.qty} × {fmtDate(sale.recordedAt)} {fmtTime(sale.recordedAt)}
                      {sale.type === 'return' && <span className="text-danger ml-1">(return)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold ${sale.type === 'return' ? 'text-danger' : 'text-brand'}`}>
                      {sale.type === 'return' ? '-' : ''}R{(sale.priceAtSale * sale.qty).toFixed(2)}
                    </p>
                    {sale.type !== 'return' && sale.productId && (
                      <button
                        onClick={() => setReturning(sale)}
                        className="text-[10px] font-semibold px-2 py-1 rounded-lg min-h-0"
                        style={{ background: 'var(--pill-red-bg)', color: '#EF4444' }}
                      >
                        Return
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Qty picker sheet */}
      {selling && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelling(null)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-0.5">{selling.name}</h2>
            <p className="text-muted text-sm mb-6">R{selling.price.toFixed(2)} each · {selling.qty - (cartMap[selling.id] ?? 0)} available</p>
            <div className="flex items-center justify-center gap-6 mb-6">
              <button onClick={() => setQtyForSelling(q => Math.max(1, q-1))} className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{ background: '#1A2236', color: 'white' }}>−</button>
              <div className="text-center min-w-[60px]"><p className="text-5xl font-black text-white">{qtyForSelling}</p></div>
              <button onClick={() => setQtyForSelling(q => Math.min(selling.qty - (cartMap[selling.id] ?? 0), q+1))} className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold" style={{ background: '#1A2236', color: 'white' }}>+</button>
            </div>
            <div className="card p-4 mb-5 flex items-center justify-between">
              <span className="text-muted text-sm">Subtotal</span>
              <span className="text-brand font-bold text-xl">R{(selling.price * qtyForSelling).toFixed(2)}</span>
            </div>
            <button onClick={() => { haptic(30); setCart(prev => { const e = prev.find(i => i.product.id === selling!.id); return e ? prev.map(i => i.product.id === selling!.id ? { ...i, qty: i.qty + qtyForSelling } : i) : [...prev, { product: selling!, qty: qtyForSelling }] }); setSelling(null) }}
              className="btn-primary active:scale-[0.98] transition-transform">
              {t('sales.addToCart')}
            </button>
          </div>
        </div>
      )}

      {/* Return confirmation sheet */}
      {returning && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setReturning(null)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-1">Confirm Return</h2>
            <p className="text-muted text-sm mb-5">This will reverse the sale and add stock back.</p>
            <div className="card p-4 mb-5">
              <p className="text-white font-semibold">{returning.productName ?? 'Unknown'}</p>
              <p className="text-muted text-sm mt-1">{returning.qty} × R{returning.priceAtSale.toFixed(2)}</p>
              <p className="text-danger font-bold text-lg mt-2">-R{(returning.priceAtSale * returning.qty).toFixed(2)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReturning(null)} className="flex-1 rounded-xl py-3 text-sm font-semibold" style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--card-border)' }}>
                Cancel
              </button>
              <button onClick={confirmReturn} disabled={isPending}
                className="flex-1 rounded-xl py-3 text-sm font-bold"
                style={{ background: 'var(--pill-red-bg)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', opacity: isPending ? 0.5 : 1 }}>
                {isPending ? 'Processing…' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <Receipt storeName={storeName} items={receipt.items} total={receipt.total}
          date={new Date().toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}
          onClose={() => setReceipt(null)} />
      )}
    </>
  )
}
