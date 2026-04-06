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

const cardStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 20px rgba(0,0,0,0.25)',
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
        <h1 className="text-xl font-bold text-white">My Stores</h1>
        <Link
          href="/onboarding?new=1"
          className="text-sm font-semibold px-3 py-1.5 rounded-full min-h-0"
          style={{ background: 'rgba(0,200,150,0.12)', color: '#00C896', border: '1px solid rgba(0,200,150,0.25)' }}
        >
          + Add store
        </Link>
      </div>

      {/* Combined summary */}
      {allStores.length > 1 && (
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(0,200,150,0.15) 0%, rgba(0,100,70,0.06) 100%)', border: '1px solid rgba(0,200,150,0.2)', boxShadow: '0 0 40px rgba(0,200,150,0.1), 0 1px 0 rgba(255,255,255,0.08) inset' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-3xl pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)' }} />
          <p className="text-brand/60 text-xs font-semibold uppercase tracking-widest mb-3">All Stores Combined</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-muted text-xs mb-1">Today</p>
              <p className="text-white font-bold text-lg">R{totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted text-xs mb-1">Sales</p>
              <p className="text-white font-bold text-lg">{totalSales}</p>
            </div>
            <div>
              <p className="text-muted text-xs mb-1">Credit</p>
              <p className="text-danger font-bold text-lg">R{totalCredit.toFixed(2)}</p>
            </div>
          </div>
          {topStore && allStores.length > 1 && (
            <p className="text-brand/60 text-xs mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,200,150,0.1)' }}>
              🏆 Top today: <span className="text-brand font-semibold">{topStore.name}</span> — R{topStore.todayRevenue.toFixed(2)}
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
              className="rounded-2xl p-4"
              style={{
                ...cardStyle,
                border: isActive ? '1px solid rgba(0,200,150,0.3)' : cardStyle.border,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: isActive ? '#00C896' : 'rgba(255,255,255,0.08)', color: isActive ? '#080f1a' : '#5a7a94' }}
                  >
                    {m.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{m.name}</p>
                    {isActive && <p className="text-brand text-xs">Currently viewing</p>}
                  </div>
                </div>
                {allStores.length > 1 && totalRevenue > 0 && (
                  <div className="text-right">
                    <p className="text-muted text-xs">Share</p>
                    <p className="text-white font-semibold text-sm">
                      {totalRevenue > 0 ? Math.round((m.todayRevenue / totalRevenue) * 100) : 0}%
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <div className="text-center">
                  <p className="text-muted text-xs mb-1">Revenue</p>
                  <p className="text-white font-bold">R{m.todayRevenue.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted text-xs mb-1">Products</p>
                  <p className="text-white font-bold">{m.productCount}</p>
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
