'use client'

import { useTransition } from 'react'
import { ProductWithStatus } from '@/domain/entities/product'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'

export default function QuickSell({
  topProducts, recordSaleAction,
}: {
  topProducts: ProductWithStatus[]
  recordSaleAction: (productId: string, qty: number, price: number) => Promise<void>
}) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  if (topProducts.length === 0) return null

  function sell(p: ProductWithStatus) {
    if (p.qty <= 0 || isPending) return
    haptic([50, 30, 50])
    startTransition(async () => {
      await recordSaleAction(p.id, 1, p.price)
      toast(`Sold 1× ${p.name} — R${p.price.toFixed(2)}`)
    })
  }

  return (
    <div>
      <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">Quick Sell</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {topProducts.map((p) => (
          <button key={p.id} onClick={() => sell(p)} disabled={isPending || p.qty <= 0}
            className="flex-shrink-0 card px-4 py-3 active:scale-[0.96] transition-transform min-w-[100px] text-left"
            style={{ opacity: isPending ? 0.5 : p.qty <= 0 ? 0.3 : 1 }}>
            <p className="text-white text-sm font-semibold truncate">{p.name}</p>
            <p className="text-brand font-bold mt-1">R{p.price.toFixed(2)}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
