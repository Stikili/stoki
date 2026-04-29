'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'

export interface OfflineSale {
  id: string
  items: { productId: string; qty: number; priceAtSale: number }[]
  queuedAt: string
}

interface OfflineState {
  pendingSales: OfflineSale[]
  isSyncing: boolean
  queueSale: (items: OfflineSale['items']) => void
  sync: () => Promise<void>
  clearAll: () => void
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (setState, getState) => ({
      pendingSales: [],
      isSyncing: false,

      queueSale(items) {
        const sale: OfflineSale = {
          id: crypto.randomUUID(),
          items,
          queuedAt: new Date().toISOString(),
        }
        setState(s => ({ pendingSales: [...s.pendingSales, sale] }))
      },

      async sync() {
        const { pendingSales } = getState()
        if (pendingSales.length === 0) return
        setState({ isSyncing: true })

        // Dynamic import to avoid bundling server action at module level
        const { recordCartAction } = await import('@/app/(app)/sales/actions')

        const remaining: OfflineSale[] = []
        for (const sale of pendingSales) {
          try {
            await recordCartAction(sale.items)
          } catch {
            remaining.push(sale)
          }
        }
        setState({ pendingSales: remaining, isSyncing: false })
      },

      clearAll() {
        setState({ pendingSales: [] })
      },
    }),
    {
      name: 'stoki-offline-sales',
      storage: {
        getItem: async (name) => {
          const v = await get(name)
          return v ?? null
        },
        setItem: async (name, value) => {
          await set(name, value)
        },
        removeItem: async (name) => {
          await del(name)
        },
      },
    }
  )
)
