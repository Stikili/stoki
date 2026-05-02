import Link from 'next/link'
import {
  Wallet,
  Calculator,
  FileText,
  Users,
  BarChart3,
  Truck,
  Receipt,
  Tags,
  ClipboardCheck,
} from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { getWeeklySummary } from '@/application/sales/getDailySummary'
import { balanceOf, isOverdue as isInvoiceOverdue, daysOverdue } from '@/domain/entities/invoice'
import { daysUntilExpiry, isExpiringSoon } from '@/domain/entities/product'
import SetupChecklist from '@/components/SetupChecklist'
import { isOverdue } from '@/domain/entities/debtor'
import DashboardHeader from './DashboardHeader'
import AskStokiPrompt from './AskStokiPrompt'

export default async function DashboardPage() {
  const { supabase, store, role } = await getServerData()

  const saleRepo = new SaleRepository(supabase)
  const alertRepo = new AlertRepository(supabase)
  const expenseRepo = new ExpenseRepository(supabase)
  const invoiceRepo = new InvoiceRepository(supabase)

  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    todaySales,
    weekSales,
    monthSales,
    monthExpenses,
    todayCashSales,
    unreadAlerts,
    weekDaily,
    allProducts,
    allDebtors,
    openInvoices,
  ] = await Promise.all([
    saleRepo.summarise(store.id, dayStart, dayEnd),
    saleRepo.summarise(store.id, weekStart, dayEnd),
    saleRepo.summarise(store.id, monthStart, dayEnd),
    expenseRepo.sumByPeriod(store.id, monthStart, dayEnd),
    saleRepo.findByPeriod(store.id, dayStart, dayEnd),
    alertRepo.findUnread(store.id),
    getWeeklySummary(saleRepo, store.id),
    getCachedProducts(store.id),
    getCachedDebtors(store.id),
    invoiceRepo.findOpen(store.id).catch(() => []),
  ])

  const lowStockCount = allProducts.filter((p) => p.status === 'low' || p.status === 'out').length
  // Surface anything expiring within 7 days (already-expired included).
  // Already-expired items are also flagged separately so the pill copy can
  // shout when there's stock that should not be on the shelf right now.
  const expiringProducts = allProducts.filter((p) => isExpiringSoon(p, 7, now))
  const expiredCount = expiringProducts.filter((p) => {
    const days = daysUntilExpiry(p, now)
    return days !== null && days <= 0
  }).length
  const totalOutstanding = allDebtors.reduce((sum, d) => sum + d.totalOwed, 0)
  const monthNetProfit = monthSales.totalMargin - monthExpenses
  const expectedCashToday = todayCashSales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + s.priceAtSale * s.qty * (s.type === 'return' ? -1 : 1), 0)

  // Awaiting-payment summary — repo already filters to draft/sent rows.
  const totalInvoiceOutstanding = openInvoices.reduce((sum, inv) => sum + balanceOf(inv), 0)
  const overdueInvoices = openInvoices.filter((inv) => isInvoiceOverdue(inv, now))
  const worstOverdueDays = overdueInvoices.reduce(
    (worst, inv) => Math.max(worst, daysOverdue(inv, now)),
    0,
  )

  const hour = new Date().getHours()
  const maxRevenue = Math.max(...weekDaily.map((d) => d.totalRevenue), 1)
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]
  })

  // "Have you started building inventory?" — once any product exists this is
  // done (whether qty was set on creation or bumped via a later restock).
  // Previously gated on `qty > 0` which re-flipped to undone after selling out.
  const hasAnyProduct = allProducts.length > 0
  const hasAnySale = weekSales.transactionCount > 0
  const hasAnyDebtor = allDebtors.length > 0
  const checklistItems = [
    { key: 'store', label: 'Store created', done: true, href: '/settings', cta: 'View settings' },
    { key: 'stock', label: 'Add your products', done: hasAnyProduct, href: '/inventory', cta: 'Add a product' },
    { key: 'sale', label: 'Record your first sale', done: hasAnySale, href: '/sales', cta: 'Record a sale' },
    { key: 'debtor', label: 'Add a credit customer', done: hasAnyDebtor, href: '/credit', cta: 'Add a customer' },
  ]

  const hasAnyMoneyData = todaySales.transactionCount > 0 || monthSales.transactionCount > 0 || monthExpenses > 0
  // Cashier role hides P&L/cost/margin/reports — they record sales only.
  const isCashier = role === 'cashier'

  return (
    <div className="px-5 pt-5 pb-4 space-y-5">
      {/* Greeting */}
      <DashboardHeader storeName={store.name} hour={hour} />

      {/* Checklist */}
      {!store.onboardingCompleted || !checklistItems.every((i) => i.done) ? (
        <SetupChecklist storeId={store.id} items={checklistItems} />
      ) : null}

      {/* Credit hero — outstanding informal trade credit */}
      {totalOutstanding > 0 && (() => {
        const overdueDebtors = allDebtors.filter(d => isOverdue(d))
        const topDebtors = allDebtors.filter(d => d.totalOwed > 0).slice(0, 3)
        return (
          <Link href="/credit" className="card p-5 block" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted text-xs font-semibold uppercase tracking-widest">Credit Owed</p>
              {overdueDebtors.length > 0 && (
                <span className="pill pill-red min-h-0 text-[10px]">{overdueDebtors.length} overdue</span>
              )}
            </div>
            <p className="text-[32px] font-bold text-danger leading-none">R{totalOutstanding.toFixed(2)}</p>
            <p className="text-muted text-sm mt-2">{allDebtors.filter(d => d.totalOwed > 0).length} customer{allDebtors.filter(d => d.totalOwed > 0).length !== 1 ? 's' : ''}</p>
            {topDebtors.length > 0 && (
              <div className="flex flex-col gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                {topDebtors.map(d => (
                  <div key={d.id} className="flex items-center justify-between">
                    <span className="text-sm text-muted truncate">{d.name}</span>
                    <span className="text-sm font-semibold text-danger">R{d.totalOwed.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </Link>
        )
      })()}

      {/* Revenue hero — primary glanceable metric */}
      <div className="card p-6">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Today&apos;s Revenue</p>
        <p className="text-[42px] font-bold text-white leading-none">
          R{todaySales.totalRevenue.toFixed(2)}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="text-muted">{todaySales.transactionCount} sale{todaySales.transactionCount !== 1 ? 's' : ''}</span>
          {!isCashier && todaySales.totalMargin > 0 && (
            <span className="text-brand font-semibold">R{todaySales.totalMargin.toFixed(2)} profit</span>
          )}
        </div>
      </div>

      {/* Money — End of day · Month-to-date · Awaiting payment.
          Cashiers don't see margins/expenses/invoices — hide entirely. */}
      {!isCashier && hasAnyMoneyData && (
        <div className="card overflow-hidden">
          <Link
            href="/cashup"
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>End-of-day cash up</p>
              <p className="text-muted text-xs mt-0.5">
                {expectedCashToday > 0
                  ? `Expected R${expectedCashToday.toFixed(2)} in the till`
                  : 'No cash sales yet today'}
              </p>
            </div>
            <span className="text-muted">→</span>
          </Link>

          <Link
            href="/reports"
            className="flex items-center justify-between px-4 py-3.5"
            style={totalInvoiceOutstanding > 0 ? { borderBottom: '1px solid var(--card-border)' } : {}}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Month-to-date</p>
              <p className="text-muted text-xs mt-0.5">
                Net{' '}
                <span className={monthNetProfit >= 0 ? 'text-brand' : 'text-danger'}>
                  R{monthNetProfit.toFixed(2)}
                </span>
                {store.vatRegistered && monthSales.totalVat > 0 && (
                  <> · VAT R{monthSales.totalVat.toFixed(2)}</>
                )}
              </p>
            </div>
            <span className="text-muted">→</span>
          </Link>

          {totalInvoiceOutstanding > 0 && (
            <Link
              href="/invoices"
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Awaiting payment{' '}
                  {overdueInvoices.length > 0 && (
                    <span className="pill pill-red min-h-0 text-[9px] py-0 ml-1">
                      {overdueInvoices.length} overdue
                    </span>
                  )}
                </p>
                <p className="text-muted text-xs mt-0.5">
                  R{totalInvoiceOutstanding.toFixed(2)} from {openInvoices.length} invoice{openInvoices.length === 1 ? '' : 's'}
                  {worstOverdueDays > 0 && ` · ${worstOverdueDays}d overdue`}
                </p>
              </div>
              <span className="text-muted">→</span>
            </Link>
          )}
        </div>
      )}

      {/* Status pills — at a glance */}
      <div className="flex gap-2 flex-wrap">
        {unreadAlerts.length > 0 && (
          <Link href="/alerts" className="pill pill-yellow min-h-0">{unreadAlerts.length} alert{unreadAlerts.length > 1 ? 's' : ''}</Link>
        )}
        {lowStockCount > 0 && (
          <Link href="/inventory" className="pill pill-red min-h-0">{lowStockCount} low stock</Link>
        )}
        {expiringProducts.length > 0 && (
          <Link href="/inventory?filter=expiring" className={`pill min-h-0 ${expiredCount > 0 ? 'pill-red' : 'pill-orange'}`}>
            {expiredCount > 0
              ? `${expiredCount} expired${expiringProducts.length > expiredCount ? `, +${expiringProducts.length - expiredCount} soon` : ''}`
              : `${expiringProducts.length} expiring`}
          </Link>
        )}
        {totalOutstanding > 0 && (
          <Link href="/credit" className="pill pill-orange min-h-0">R{totalOutstanding.toFixed(0)} owed</Link>
        )}
      </div>

      {/* Ask Stoki — inline prompt + suggestion chips */}
      <AskStokiPrompt vatRegistered={store.vatRegistered} />

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
        {!isCashier && weekSales.totalMargin > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #1E293B' }}>
            <p className="text-muted text-xs">Week profit</p>
            <p className="text-brand font-bold text-sm">R{weekSales.totalMargin.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Manage — feature grid. Filtered by role: cashiers see only what
          they need to record sales (Pricelist + Settings for store switch). */}
      <div>
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 ml-1">Manage</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { href: '/cashup',    label: 'Cash up',   Icon: Calculator,     roles: ['owner', 'manager'] },
            { href: '/reports',   label: 'Reports',   Icon: BarChart3,      roles: ['owner', 'manager'] },
            { href: '/invoices',  label: 'Invoices',  Icon: Receipt,        roles: ['owner', 'manager'] },
            { href: '/customers', label: 'Customers', Icon: Users,          roles: ['owner', 'manager'] },
            { href: '/expenses',  label: 'Expenses',  Icon: Wallet,         roles: ['owner', 'manager'] },
            { href: '/suppliers', label: 'Suppliers', Icon: Truck,          roles: ['owner', 'manager'] },
            { href: '/stocktake', label: 'Stocktake', Icon: ClipboardCheck, roles: ['owner', 'manager'] },
            { href: '/pricelist', label: 'Prices',    Icon: Tags,           roles: ['owner', 'manager', 'cashier'] },
            { href: '/settings',  label: 'Settings',  Icon: FileText,       roles: ['owner', 'manager', 'cashier'] },
          ]
            .filter((tile) => tile.roles.includes(role))
            .map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="card flex flex-col items-center justify-center py-3 px-2 active:scale-[0.97] transition-transform">
              <Icon size={20} color="#7B8CA1" strokeWidth={1.75} />
              <span className="text-[10px] font-semibold mt-1.5" style={{ color: 'var(--muted)' }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
