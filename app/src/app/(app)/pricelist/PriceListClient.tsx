'use client'

import { ProductWithStatus } from '@/domain/entities/product'
import { useToast } from '@/components/Toast'

export default function PriceListClient({ products, storeName, storePhone }: { products: ProductWithStatus[]; storeName: string; storePhone: string | null }) {
  const { toast } = useToast()
  const inStock = products.filter(p => p.qty > 0)

  function text() {
    return [`📋 *${storeName} — Price List*`, storePhone ? `📞 ${storePhone}` : '', '', ...inStock.map(p => `• ${p.name} — R${p.price.toFixed(2)}`), '', `${inStock.length} products in stock`, `Updated: ${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`].filter(Boolean).join('\n')
  }

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-5">Price List</h1>
      <div className="card p-5 mb-4">
        <p className="text-white font-bold text-lg mb-1">{storeName}</p>
        {storePhone && <p className="text-muted text-sm mb-3">{storePhone}</p>}
        <div className="space-y-2">
          {inStock.map(p => (<div key={p.id} className="flex items-center justify-between"><span className="text-white text-sm">{p.name}</span><span className="text-brand font-bold text-sm">R{p.price.toFixed(2)}</span></div>))}
        </div>
        <p className="text-muted text-xs mt-4">{inStock.length} products</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(text())}`, '_blank'); toast('Shared', 'info') }} className="flex-1 py-3.5 rounded-xl font-semibold text-sm" style={{ background: '#25D366', color: 'white' }}>Share via WhatsApp</button>
        <button onClick={() => { navigator.clipboard.writeText(text()); toast('Copied', 'info') }} className="flex-1 py-3.5 rounded-xl font-semibold text-sm" style={{ background: '#141B2D', color: '#8896AB', border: '1px solid #1E293B' }}>Copy Text</button>
      </div>
    </>
  )
}
