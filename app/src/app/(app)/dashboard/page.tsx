import Link from 'next/link'
import { CirclePlus, Wallet, Calculator, FileText, Users } from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { getWeeklySummary } from '@/application/sales/getDailySummary'
import SetupChecklist from '@/components/SetupChecklist'
import QuickSell from './QuickSell'
import { recordSaleAction } from '../sales/actions'

export default async function DashboardPage() {
  const { supabase, store } = await getServerData()

  const saleRepo = new SaleRepository(supabase)
  const alertRepo = new AlertRepository(supabase)

  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0)

  const [todaySales, weekSales, unreadAlerts, weekDaily, allProducts, allDebtors] = await Promise.all([
    saleRepo.summarise(store.id, dayStart, dayEnd),
    saleRepo.summarise(store.id, weekStart, dayEnd),
    alertRepo.findUnread(store.id),
    getWeeklySummary(saleRepo, store.id),
    getCachedProducts(store.id),
    getCachedDebtors(store.id),
  ])

  const lowStockCount = allProducts.filter((p) => p.status === 'low' || p.status === 'out').length
  const totalOutstanding = allDebtors.reduce((sum, d) => sum + d.totalOwed, 0)

  // Quick sell: top 5 most-sold products
  const recentSales = await saleRepo.findByPeriod(store.id, weekStart, dayEnd)
  const salesCount: Record<string, number> = {}
  for (const s of recentSales) {
    if (s.productId) salesCount[s.productId] = (salesCount[s.productId] ?? 0) + s.qty
  }
  const topProducts = allProducts.filter((p) => p.qty > 0).sort((a, b) => (salesCount[b.id] ?? 0) - (salesCount[a.id] ?? 0)).slice(0, 5)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const maxRevenue = Math.max(...weekDaily.map((d) => d.totalRevenue), 1)
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]
  })

  const hasQty = allProducts.some((p) => p.qty > 0)
  const hasAnySale = weekSales.transactionCount > 0
  const hasAnyDebtor = allDebtors.length > 0
  const checklistItems = [
    { key: 'store', label: 'Store created', done: true, href: '/settings', cta: 'View settings' },
    { key: 'stock', label: 'Add stock quantities', done: hasQty, href: '/inventory', cta: 'Add quantities' },
    { key: 'sale', label: 'Record your first sale', done: hasAnySale, href: '/sales', cta: 'Record a sale' },
    { key: 'debtor', label: 'Add a credit customer', done: hasAnyDebtor, href: '/credit', cta: 'Add a customer' },
  ]

  return (
    <div className="px-5 pt-5 pb-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-white">{greeting}</h1>
        <p className="text-muted text-sm mt-0.5">{store.name}</p>
      </div>

      {/* Checklist */}
      {!store.onboardingCompleted || !checklistItems.every((i) => i.done) ? (
        <SetupChecklist storeId={store.id} items={checklistItems} />
      ) : null}

      {/* Revenue hero — big and clear */}
      <div className="card p-6">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Today&apos;s Revenue</p>
        <p className="text-[42px] font-bold text-white leading-none">
          R{todaySales.totalRevenue.toFixed(2)}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="text-muted">{todaySales.transactionCount} sale{todaySales.transactionCount !== 1 ? 's' : ''}</span>
          {todaySales.totalMargin > 0 && (
            <span className="text-brand font-semibold">R{todaySales.totalMargin.toFixed(2)} profit</span>
          )}
        </div>
      </div>

      {/* Big sell button */}
      <Link href="/sales"
        className="flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform"
        style={{ background: '#00C896', color: 'var(--btn-primary-text)' }}>
        <CirclePlus size={22} strokeWidth={2.5} />
        Record Sale
      </Link>

      {/* Quick sell */}
      <QuickSell topProducts={topProducts} recordSaleAction={recordSaleAction} />

      {/* Status pills — at a glance */}
      <div className="flex gap-2 flex-wrap">
        {unreadAlerts.length > 0 && (
          <Link href="/alerts" className="pill pill-yellow min-h-0">{unreadAlerts.length} alert{unreadAlerts.length > 1 ? 's' : ''}</Link>
        )}
        {lowStockCount > 0 && (
          <Link href="/inventory" className="pill pill-red min-h-0">{lowStockCount} low stock</Link>
        )}
        {totalOutstanding > 0 && (
          <Link href="/credit" className="pill pill-orange min-h-0">R{totalOutstanding.toFixed(0)} owed</Link>
        )}
      </div>

      {/* 7-day chart — compact */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-muted text-xs font-semibold uppercase tracking-widest">7-Day Revenue</p>
          <p className="text-white font-bold text-sm">R{weekSales.totalRevenue.toFixed(0)}</p>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {weekDaily.map((day, i) => {
            const heightPct = (day.totalRevenue / maxRevenue) * 100
            const isToday = i === 6
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-md" style={{
                  height: `${Math.max(heightPct, day.totalRevenue > 0 ? 12 : 4)}%`,
                  background: day.totalRevenue > 0 ? (isToday ? '#00C896' : '#1E4D3F') : '#1A2236',
                }} />
                <span className={`text-[9px] font-medium ${isToday ? 'text-brand' : 'text-muted'}`}>{dayLabels[i]}</span>
              </div>
            )
          })}
        </div>
        {weekSales.totalMargin > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #1E293B' }}>
            <p className="text-muted text-xs">Week profit</p>
            <p className="text-brand font-bold text-sm">R{weekSales.totalMargin.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Quick links — secondary actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { href: '/expenses', label: 'Expenses', Icon: Wallet },
          { href: '/cashup', label: 'Cash Up', Icon: Calculator },
          { href: '/pricelist', label: 'Prices', Icon: FileText },
          { href: '/customers', label: 'Customers', Icon: Users },
        ].map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="card flex flex-col items-center justify-center py-3 px-2 active:scale-[0.97] transition-transform">
            <Icon size={20} color="#7B8CA1" strokeWidth={1.75} />
            <span className="text-[10px] font-semibold mt-1.5" style={{ color: 'var(--muted)' }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
