import Link from 'next/link'
import { getServerData } from '@/lib/getServerData'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { getWeeklySummary } from '@/application/sales/getDailySummary'
import { withStatus } from '@/domain/entities/product'
import SetupChecklist from '@/components/SetupChecklist'

export default async function DashboardPage() {
  const { supabase, store } = await getServerData()

  const saleRepo = new SaleRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0)

  // Sales + alerts always fresh; products + debtors from cache
  const [todaySales, weekSales, unreadAlerts, weekDaily, allProducts, allDebtors] = await Promise.all([
    saleRepo.summarise(store.id, dayStart, dayEnd),
    saleRepo.summarise(store.id, weekStart, dayEnd),
    alertRepo.findUnread(store.id),
    getWeeklySummary(saleRepo, store.id),
    getCachedProducts(store.id),
    getCachedDebtors(store.id),
  ])

  const lowStockProducts = allProducts.filter((p) => p.status === 'low' || p.status === 'out')
  const totalOutstanding = allDebtors.reduce((sum, d) => sum + d.totalOwed, 0)

  const dashboard = {
    today: todaySales,
    week: weekSales,
    lowStockProducts,
    unreadAlerts,
    totalOutstanding,
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const maxRevenue = Math.max(...weekDaily.map((d) => d.totalRevenue), 1)
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
  })

  // Checklist — uses cached data already fetched above
  const hasQty = allProducts.some((p) => p.qty > 0)
  const hasAnySale = weekSales.transactionCount > 0
  const hasAnyDebtor = allDebtors.length > 0

  const checklistItems = [
    { key: 'store', label: 'Store created', done: true, href: '/settings', cta: 'View settings' },
    { key: 'stock', label: 'Add stock quantities', done: hasQty, href: '/inventory', cta: 'Add quantities → 2 min' },
    { key: 'sale', label: 'Record your first sale', done: hasAnySale, href: '/sales', cta: 'Record a sale' },
    { key: 'debtor', label: 'Add a credit customer', done: hasAnyDebtor, href: '/credit', cta: 'Add a customer' },
  ]

  return (
    <div className="px-4 pt-6 pb-4 space-y-3">
      {/* Greeting */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-white">{greeting} 👋</h1>
        <p className="text-muted text-sm mt-0.5">{store.name}</p>
      </div>

      {/* Setup checklist — shown until all done or dismissed */}
      {!store.onboardingCompleted || !checklistItems.every((i) => i.done) ? (
        <SetupChecklist storeId={store.id} items={checklistItems} />
      ) : null}

      {/* Alert strip */}
      {dashboard.unreadAlerts.length > 0 && (
        <Link
          href="/alerts"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 min-h-0"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: '0 0 20px rgba(245,158,11,0.08)',
          }}
        >
          <span className="text-lg">⚡</span>
          <span className="text-warning text-sm font-semibold">
            {dashboard.unreadAlerts.length} alert{dashboard.unreadAlerts.length > 1 ? 's' : ''} need your attention
          </span>
          <span className="ml-auto text-warning text-lg">›</span>
        </Link>
      )}

      {/* Revenue hero */}
      <div
        className="rounded-3xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,200,150,0.18) 0%, rgba(0,120,90,0.08) 100%)',
          border: '1px solid rgba(0,200,150,0.25)',
          boxShadow: '0 0 40px rgba(0,200,150,0.15), 0 1px 0 rgba(255,255,255,0.1) inset',
        }}
      >
        {/* Gloss shine */}
        <div
          className="absolute top-0 left-0 right-0 h-1/2 rounded-t-3xl pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)' }}
        />
        <p className="text-brand/70 text-xs font-semibold uppercase tracking-widest mb-2">Today&apos;s Revenue</p>
        <p
          className="text-5xl font-bold mb-1"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #a8f0da 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          R{dashboard.today.totalRevenue.toFixed(2)}
        </p>
        <p className="text-brand/60 text-sm">
          {dashboard.today.transactionCount} sale{dashboard.today.transactionCount !== 1 ? 's' : ''} ·{' '}
          {dashboard.today.itemsSold} item{dashboard.today.itemsSold !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/sales', label: 'Record Sale', emoji: '💰', color: 'rgba(0,200,150,0.12)', border: 'rgba(0,200,150,0.25)', text: '#00C896', glow: 'rgba(0,200,150,0.15)' },
          { href: '/inventory', label: 'Add Stock', emoji: '📦', color: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', text: '#60a5fa', glow: 'rgba(59,130,246,0.12)' },
          { href: '/credit', label: 'Add Credit', emoji: '📋', color: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', text: '#fb923c', glow: 'rgba(249,115,22,0.12)' },
          { href: '/advisor', label: 'Ask Stoki', emoji: '✨', color: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', text: '#c084fc', glow: 'rgba(168,85,247,0.12)' },
        ].map(({ href, label, emoji, color, border, text, glow }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl p-4 active:scale-[0.96] transition-transform relative overflow-hidden"
            style={{
              background: color,
              border: `1px solid ${border}`,
              boxShadow: `0 0 20px ${glow}, 0 1px 0 rgba(255,255,255,0.08) inset`,
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)' }}
            />
            <div className="text-2xl mb-2">{emoji}</div>
            <p className="font-semibold text-sm" style={{ color }}>{label}</p>
          </Link>
        ))}
      </div>

      {/* 7-day chart */}
      <div
        className="rounded-3xl p-5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset',
        }}
      >
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-4">7-Day Revenue</p>
        <div className="flex items-end gap-1.5 h-20">
          {weekDaily.map((day, i) => {
            const heightPct = (day.totalRevenue / maxRevenue) * 100
            const isToday = i === 6
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-md transition-all duration-500"
                  style={{
                    height: `${Math.max(heightPct, day.totalRevenue > 0 ? 12 : 6)}%`,
                    background: day.totalRevenue > 0
                      ? isToday
                        ? 'linear-gradient(180deg, #00e8b3 0%, #00C896 100%)'
                        : 'linear-gradient(180deg, rgba(0,200,150,0.6) 0%, rgba(0,200,150,0.3) 100%)'
                      : 'rgba(255,255,255,0.06)',
                    boxShadow: day.totalRevenue > 0 && isToday ? '0 0 12px rgba(0,200,150,0.4)' : 'none',
                  }}
                />
                <span className={`text-[9px] font-medium ${isToday ? 'text-brand' : 'text-muted'}`}>
                  {isToday ? 'Today' : dayLabels[i]}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-muted text-xs">Week total</p>
          <p className="text-white font-bold text-sm">R{dashboard.week.totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Status strips */}
      {dashboard.lowStockProducts.length > 0 && (
        <Link
          href="/inventory"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 min-h-0"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <span className="text-lg">🔴</span>
          <span className="text-danger text-sm font-semibold">
            {dashboard.lowStockProducts.length} product{dashboard.lowStockProducts.length > 1 ? 's' : ''} low or out of stock
          </span>
          <span className="ml-auto text-danger text-lg">›</span>
        </Link>
      )}

      {dashboard.totalOutstanding > 0 && (
        <Link
          href="/credit"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 min-h-0"
          style={{
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.2)',
          }}
        >
          <span className="text-lg">💳</span>
          <span className="text-orange-400 text-sm font-semibold">
            R{dashboard.totalOutstanding.toFixed(2)} outstanding credit
          </span>
          <span className="ml-auto text-orange-400 text-lg">›</span>
        </Link>
      )}
    </div>
  )
}
