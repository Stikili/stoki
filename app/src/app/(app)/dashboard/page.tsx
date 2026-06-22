import Link from 'next/link'
import { getServerData } from '@/lib/getServerData'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'
import { getCachedDashboardSnapshot } from '@/lib/cached-dashboard'
import { balanceOf, isOverdue as isInvoiceOverdue, daysOverdue, type Invoice } from '@/domain/entities/invoice'
import { agingTotals as billAgingTotals, isOpen as billIsOpen, type SupplierBill } from '@/domain/entities/supplier-bill'
import { type Sale, type SalesSummary } from '@/domain/entities/sale'
import { type Alert } from '@/domain/entities/alert'
import { type RecurringExpense } from '@/domain/entities/recurring-expense'
import { buildForecast } from '@/lib/cashflow-forecast'
import { daysUntilExpiry, isExpiringSoon } from '@/domain/entities/product'
import SetupChecklist from '@/components/SetupChecklist'
import SassaPayCard from '@/components/SassaPayCard'
import ProvisionalTaxCard from '@/components/ProvisionalTaxCard'
import { isOverdue } from '@/domain/entities/debtor'
import { nextSassaPayDates, imminentPayEvent } from '@/lib/sassa'
import { compareToLastWeek, weekdayName } from '@/lib/revenue-comparison'
import { estimateProvisional } from '@/lib/tax/provisional'
import { hasFeature, type GateId } from '@/lib/plan-gates'
import DashboardHeader from './DashboardHeader'
import DashboardTiles from './DashboardTiles'
import AskStokiPrompt from './AskStokiPrompt'
import SaleFAB from '@/components/SaleFAB'
import TrialBanner from '@/components/TrialBanner'

interface DailySummary { totalRevenue: number; totalMargin: number; totalVat: number; transactionCount: number }

export default async function DashboardPage() {
  const { user, store, role } = await getServerData()

  // Cached dashboard snapshot (30s TTL) + the two pre-existing cached repos.
  // Three parallel reads instead of seventeen. `now` is captured inside the
  // cached snapshot, frozen for that cache window — see cached-dashboard.ts.
  const [snap, allProducts, allDebtors] = await Promise.all([
    getCachedDashboardSnapshot(store.id),
    getCachedProducts(store.id),
    getCachedDebtors(store.id),
  ])

  const now = new Date(snap.nowIso)
  const todaySales        = JSON.parse(snap.todaySalesJson) as SalesSummary
  const weekSales         = JSON.parse(snap.weekSalesJson) as SalesSummary
  const monthSales        = JSON.parse(snap.monthSalesJson) as SalesSummary
  const monthExpenses     = snap.monthExpenses
  const todayCashSales    = JSON.parse(snap.todayCashSalesJson) as Sale[]
  const unreadAlerts      = JSON.parse(snap.unreadAlertsJson) as Alert[]
  const weekDaily         = JSON.parse(snap.weekDailyJson) as DailySummary[]
  const openInvoices      = JSON.parse(snap.openInvoicesJson) as Invoice[]
  const lastWeekSameDay   = JSON.parse(snap.lastWeekSameDayJson) as SalesSummary
  const ytdSales          = JSON.parse(snap.ytdSalesJson) as SalesSummary
  const ytdExpenses       = snap.ytdExpenses
  const allBills          = JSON.parse(snap.allBillsJson) as SupplierBill[]
  const activeRecurringRules = JSON.parse(snap.activeRecurringRulesJson) as RecurringExpense[]
  const last30Expenses    = snap.last30Expenses
  const ytdDepreciation   = snap.ytdDepreciation

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

  const hasAnyMoneyData =
    todaySales.transactionCount > 0 ||
    monthSales.transactionCount > 0 ||
    monthExpenses > 0 ||
    allBills.length > 0
  // Cashier role hides P&L/cost/margin/reports — they record sales only.
  const isCashier = role === 'cashier'

  // SASSA pay-day card surfaces inside the 7-day window before the next
  // Older Persons / Disability / Children's grant payout. Cashiers benefit
  // from this signal too — they're the ones who handle the foot-traffic spike.
  const upcomingPayEvent = imminentPayEvent(nextSassaPayDates(now, 3), 7, now)

  // Today vs same weekday last week — gives the revenue hero context. Pure
  // helper returns null when there's nothing useful to say (both days dead).
  const revenueComparison = compareToLastWeek(
    todaySales.totalRevenue,
    lastWeekSameDay.totalRevenue,
    weekdayName(now),
  )

  // Provisional tax — owners/managers only. Card hides itself when YTD
  // profit is zero or negative, so we always compute and let it decide.
  // Net profit includes depreciation as a non-cash deduction so the SARS
  // estimate matches the eventual return.
  const ytdNetProfit = ytdSales.totalMargin - ytdExpenses - ytdDepreciation
  const taxEstimate = !isCashier
    ? estimateProvisional(ytdNetProfit, store.taxpayerType, now)
    : null

  // Plan-gate snapshot for the tile grid. Tiles for locked features still
  // render (lock badge + click-to-upgrade) so the dashboard drives upsell
  // rather than hiding paid surface area entirely.
  const lockedGates: GateId[] = ([
    'invoice.create',
    'reports.bank_reconcile',
    'broadcast.send',
    'payroll.run',
    'assets.manage',
    'payables.manage',
    'purchase_orders.create',
  ] as const).filter(g => !hasFeature(store, g))

  // Aged payables summary — drives the supplier-side row in the Money card.
  const openBills = allBills.filter(billIsOpen)
  const payables = billAgingTotals(openBills, now)
  const overdueBillCount =
    payables.countByBucket.days30 + payables.countByBucket.days60 + payables.countByBucket.days90Plus

  // Cash-flow alert — only surfaces when a 14-day forecast shows a deficit.
  // Same inputs as /cashflow but with a shorter window to keep dashboard
  // noise low; owners hit /cashflow for the full 30-day view.
  const cfForecast = !isCashier
    ? buildForecast({
        startingCash: store.cashBalance,
        openInvoices,
        openBills,
        recurringExpenses: activeRecurringRules,
        avgDailyRevenue: weekSales.totalRevenue / 7,
        avgDailyVariableExpense: last30Expenses / 30,
        windowDays: 14,
        now,
      })
    : null
  const cashflowAlert = cfForecast && cfForecast.firstDeficitDate
    ? { date: cfForecast.firstDeficitDate, minBalance: cfForecast.minBalance }
    : null

  return (
    <div className="px-5 pt-5 pb-4 space-y-5">
      {/* Greeting */}
      <DashboardHeader storeName={store.name} hour={hour} />

      {/* Trial countdown — only renders inside the final 3 days of the
          grandfather window. Anchored above the setup checklist so it lands
          at the top of the scroll for maximum conversion intent. */}
      <TrialBanner store={store} />

      {/* Checklist */}
      {!store.onboardingCompleted || !checklistItems.every((i) => i.done) ? (
        <SetupChecklist storeId={store.id} items={checklistItems} />
      ) : null}

      {/* SASSA pay-day signal — only renders inside the 7-day window */}
      <SassaPayCard event={upcomingPayEvent} now={now} />

      {/* Provisional tax — owners/managers only, card self-hides on zero profit */}
      {taxEstimate && (
        <ProvisionalTaxCard estimate={taxEstimate} taxpayerType={store.taxpayerType} />
      )}

      {/* Cash-flow deficit alert — 14-day forecast tripped a zero */}
      {cashflowAlert && (
        <Link
          href="/cashflow"
          className="card p-5 block"
          style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}
        >
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-1">
            Cash flow warning
          </p>
          <p className="text-[28px] font-bold leading-none text-danger">
            Cash runs out {cashflowAlert.date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-muted text-sm mt-2">
            Projected low: R{cashflowAlert.minBalance.toFixed(0)} — tap to see assumptions
          </p>
        </Link>
      )}

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
        {revenueComparison && (
          <p
            className={`text-xs font-semibold mt-2 inline-flex items-center gap-1 ${
              revenueComparison.kind === 'ahead'  ? 'text-brand'
              : revenueComparison.kind === 'behind' ? 'text-danger'
              : 'text-muted'
            }`}
          >
            {revenueComparison.kind === 'ahead'  && <span aria-hidden>↑</span>}
            {revenueComparison.kind === 'behind' && <span aria-hidden>↓</span>}
            {revenueComparison.text}
          </p>
        )}
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
              style={payables.total > 0 ? { borderBottom: '1px solid var(--card-border)' } : {}}
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

          {payables.total > 0 && (
            <Link
              href="/payables"
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Bills to pay{' '}
                  {overdueBillCount > 0 && (
                    <span className="pill pill-red min-h-0 text-[9px] py-0 ml-1">
                      {overdueBillCount} overdue
                    </span>
                  )}
                </p>
                <p className="text-muted text-xs mt-0.5">
                  R{payables.total.toFixed(2)} across {openBills.length} bill{openBills.length === 1 ? '' : 's'}
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

      {/* Manage — feature grid. Long-press any tile to see what it does.
          Modules hide until they're relevant: Payroll waits for the first
          employee or the onboarding "has employees" answer; B2B
          invoices/customers wait for VAT registration (most casual
          shoppers won't issue formal tax invoices). */}
      <DashboardTiles
        role={role}
        showPayroll={snap.employeeCount > 0 || store.hasEmployees}
        showInvoices={store.vatRegistered}
        lockedGates={lockedGates}
      />

      <SaleFAB />
    </div>
  )
}
