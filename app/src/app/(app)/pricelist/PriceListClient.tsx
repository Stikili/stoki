'use client'

import { ProductWithStatus } from '@/domain/entities/product'
import { useToast } from '@/components/Toast'

export default function PriceListClient({
  products, storeName, storePhone,
}: {
  products: ProductWithStatus[]; storeName: string; storePhone: string | null
}) {
  const { toast } = useToast()
  const inStock = products.filter((p) => p.qty > 0)

  function generateText() {
    const lines = [
      `📋 *${storeName} — Price List*`,
      storePhone ? `📞 ${storePhone}` : '',
      '',
      ...inStock.map((p) => `• ${p.name} — R${p.price.toFixed(2)}`),
      '',
      `${inStock.length} products in stock`,
      `Updated: ${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    ].filter(Boolean)
    return lines.join('\n')
  }

  async function shareWhatsApp() {
    const text = encodeURIComponent(generateText())
    window.open(`https://wa.me/?text=${text}`, '_blank')
    toast('Price list shared', 'info')
  }

  async function copyText() {
    await navigator.clipboard.writeText(generateText())
    toast('Copied to clipboard', 'info')
  }

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-5">Price List</h1>

      {/* Preview */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <p className="text-white font-bold text-lg mb-1">{storeName}</p>
        {storePhone && <p className="text-muted text-sm mb-3">{storePhone}</p>}
        <div className="space-y-1.5">
          {inStock.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="text-white text-sm">{p.name}</span>
              <span className="text-brand font-bold text-sm">R{p.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <p className="text-muted text-xs mt-4">{inStock.length} products · Updated {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={shareWhatsApp} className="flex-1 py-3.5 rounded-xl font-semibold text-sm"
          style={{ background: '#25D366', color: 'white' }}>
          Share via WhatsApp
        </button>
        <button onClick={copyText} className="flex-1 py-3.5 rounded-xl font-semibold text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#5a7a94' }}>
          Copy Text
        </button>
      </div>
    </>
  )
}
