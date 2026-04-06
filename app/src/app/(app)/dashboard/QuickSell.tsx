'use client'

import { useTransition } from 'react'
import { ProductWithStatus } from '@/domain/entities/product'
import { useToast } from '@/components/Toast'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptic'

export default function QuickSell({
  topProducts,
  recordSaleAction,
}: {
  topProducts: ProductWithStatus[]
  recordSaleAction: (productId: string, qty: number, price: number) => Promise<void>
}) {
  const { toast } = useToast()
  const { t } = useI18n()
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
      <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">{t('dashboard.quickSell')}</p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {topProducts.map((p) => (
          <button
            key={p.id}
            onClick={() => sell(p)}
            disabled={isPending || p.qty <= 0}
            className="flex-shrink-0 rounded-2xl px-4 py-3 active:scale-[0.96] transition-transform min-w-[110px]"
            style={{
              background: p.qty > 0 ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${p.qty > 0 ? 'rgba(0,200,150,0.2)' : 'rgba(255,255,255,0.06)'}`,
              opacity: isPending ? 0.5 : p.qty <= 0 ? 0.4 : 1,
            }}
          >
            <p className="text-white text-sm font-semibold truncate">{p.name}</p>
            <p className="text-brand font-bold mt-1">R{p.price.toFixed(2)}</p>
            <p className="text-muted text-xs mt-0.5">{p.qty > 0 ? `${p.qty} left` : 'Out'}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
