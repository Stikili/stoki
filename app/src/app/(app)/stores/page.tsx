import Link from 'next/link'
import { getServerData } from '@/lib/getServerData'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'

interface StoreMetrics {
  storeId: string
  name: string
  todayRevenue: number
  todaySales: number
  productCount: number
  lowStockCount: number
  outstandingCredit: number
}

export default async function StoresPage() {
  const { supabase, allStores, store: currentStore } = await getServerData()

  const saleRepo = new SaleRepository(supabase)

  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)

  const metrics: StoreMetrics[] = await Promise.all(
    allStores.map(async (s) => {
      // Sales always fresh; products + debtors from cache
      const [todaySummary, products, debtors] = await Promise.all([
        saleRepo.summarise(s.id, dayStart, dayEnd),
        getCachedProducts(s.id),
        getCachedDebtors(s.id),
      ])
      return {
        storeId: s.id,
        name: s.name,
        todayRevenue: todaySummary.totalRevenue,
        todaySales: todaySummary.transactionCount,
        productCount: products.length,
        lowStockCount: products.filter((p) => p.status === 'low' || p.status === 'out').length,
        outstandingCredit: debtors.reduce((sum, d) => sum + d.totalOwed, 0),
      }
    })
  )

  const totalRevenue = metrics.reduce((s, m) => s + m.todayRevenue, 0)
  const totalSales = metrics.reduce((s, m) => s + m.todaySales, 0)
  const totalCredit = metrics.reduce((s, m) => s + m.outstandingCredit, 0)
  const topStore = metrics.reduce((a, b) => a.todayRevenue >= b.todayRevenue ? a : b, metrics[0])

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>My Stores</h1>
        <Link
          href="/onboarding?new=1"
          className="text-sm font-semibold px-3 py-1.5 rounded-full min-h-0 pill pill-green"
        >
          + Add store
        </Link>
      </div>

      {/* Combined summary */}
      {allStores.length > 1 && (
        <div
          className="card rounded-3xl p-5 relative overflow-hidden"
          style={{ borderColor: 'rgba(0,200,150,0.2)' }}
        >
          <p className="text-brand text-xs font-semibold uppercase tracking-widest mb-3" style={{ opacity: 0.6 }}>All Stores Combined</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-muted text-xs mb-1">Today</p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>R{totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted text-xs mb-1">Sales</p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{totalSales}</p>
            </div>
            <div>
              <p className="text-muted text-xs mb-1">Credit</p>
              <p className="text-danger font-bold text-lg">R{totalCredit.toFixed(2)}</p>
            </div>
          </div>
          {topStore && allStores.length > 1 && (
            <p className="text-xs mt-3 pt-3 text-brand" style={{ borderTop: '1px solid var(--card-border)', opacity: 0.6 }}>
              🏆 Top today: <span className="text-brand font-semibold" style={{ opacity: 1 }}>{topStore.name}</span> — R{topStore.todayRevenue.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* Per-store cards */}
      <div className="flex flex-col gap-3">
        {metrics.map((m) => {
          const isActive = m.storeId === currentStore.id
          return (
            <div
              key={m.storeId}
              className="card rounded-2xl p-4"
              style={isActive ? { borderColor: 'rgba(0,200,150,0.3)' } : undefined}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: isActive ? '#00C896' : 'var(--surface)', color: isActive ? 'var(--btn-primary-text)' : 'var(--muted)' }}
                  >
                    {m.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{m.name}</p>
                    {isActive && <p className="text-brand text-xs">Currently viewing</p>}
                  </div>
                </div>
                {allStores.length > 1 && totalRevenue > 0 && (
                  <div className="text-right">
                    <p className="text-muted text-xs">Share</p>
                    <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                      {totalRevenue > 0 ? Math.round((m.todayRevenue / totalRevenue) * 100) : 0}%
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                <div className="text-center">
                  <p className="text-muted text-xs mb-1">Revenue</p>
                  <p className="font-bold" style={{ color: 'var(--foreground)' }}>R{m.todayRevenue.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted text-xs mb-1">Products</p>
                  <p className="font-bold" style={{ color: 'var(--foreground)' }}>{m.productCount}</p>
                  {m.lowStockCount > 0 && (
                    <p className="text-warning text-xs">{m.lowStockCount} low</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-muted text-xs mb-1">Credit</p>
                  <p className={`font-bold ${m.outstandingCredit > 0 ? 'text-danger' : 'text-brand'}`}>
                    R{m.outstandingCredit.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
