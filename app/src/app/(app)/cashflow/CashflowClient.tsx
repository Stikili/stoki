'use client'

import Link from 'next/link'
import { ArrowLeft, AlertTriangle, TrendingDown, Wallet } from 'lucide-react'

/**
 * Client gets a JSON-serialised forecast (dates as ISO strings) because
 * Next 16 server→client props don't carry Date instances through. We
 * re-hydrate at the render boundary.
 */
interface SerialisedDay {
  date: string
  baseInflow: number
  confirmedInflow: number
  baseOutflow: number
  confirmedOutflow: number
  net: number
  runningBalance: number
}

interface SerialisedForecast {
  days: SerialisedDay[]
  startingCash: number
  minBalance: number
  minBalanceDate: string | null
  firstDeficitDate: string | null
  totalConfirmedOutflow: number
  totalConfirmedInflow: number
}

function fmtMoney(n: number) { return `R${n.toFixed(2)}` }
function fmtR0(n: number) { return `R${Math.round(n)}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function CashflowClient({
  cashBalance,
  cashBalanceUpdatedAt,
  forecast,
  avgDailyRevenue,
  avgDailyVariableExpense,
}: {
  cashBalance: number | null
  cashBalanceUpdatedAt: string | null
  forecast: SerialisedForecast
  avgDailyRevenue: number
  avgDailyVariableExpense: number
}) {
  const cashSet = cashBalance !== null
  const days = forecast.days
  const minBal = forecast.minBalance
  const deficit = forecast.firstDeficitDate

  // Spark-style chart — running-balance line. Auto-scales y-axis.
  const balances = days.map(d => d.runningBalance)
  const maxBal = Math.max(...balances, 0)
  const minBalY = Math.min(...balances, 0)
  const range = maxBal - minBalY || 1
  const zeroY = ((maxBal - 0) / range) * 100 // % from top where 0 sits

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <ArrowLeft size={18} color="#7B8CA1" />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Cash flow</h1>
      </div>

      {!cashSet && (
        <div className="card p-4 mb-4" style={{ borderColor: 'rgba(245, 158, 11, 0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: '#F59E0B' }}>
            Set your cash float to unlock accurate forecast
          </p>
          <p className="text-muted text-xs mt-1">
            Update <Link href="/settings/store" className="underline">cash on hand</Link> in store settings — the forecast assumes zero until you do.
          </p>
        </div>
      )}

      {/* Hero — worst projected balance */}
      <div className="card p-5 mb-3">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-1">Lowest projected balance</p>
        <p className="text-[32px] font-bold leading-none" style={{ color: minBal < 0 ? '#EF4444' : minBal < 1000 ? '#F59E0B' : '#00C896' }}>
          {fmtMoney(minBal)}
        </p>
        {forecast.minBalanceDate && (
          <p className="text-muted text-sm mt-1">on {fmtDate(forecast.minBalanceDate)}</p>
        )}
        {deficit && (
          <p className="text-sm mt-3 inline-flex items-center gap-2" style={{ color: '#EF4444' }}>
            <AlertTriangle size={14} /> Cash runs out {fmtDate(deficit)}
          </p>
        )}
      </div>

      {/* Mini chart */}
      <div className="card p-5 mb-3">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">30-day balance trajectory</p>
        <div className="relative" style={{ height: '120px' }}>
          {/* Zero line */}
          <div
            className="absolute left-0 right-0"
            style={{ top: `${zeroY}%`, borderTop: '1px dashed var(--card-border)' }}
            aria-hidden
          />
          <svg viewBox={`0 0 ${days.length} 100`} preserveAspectRatio="none" className="w-full h-full">
            <polyline
              fill="none"
              stroke={minBal < 0 ? '#EF4444' : '#00C896'}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              points={balances.map((b, i) => `${i},${((maxBal - b) / range) * 100}`).join(' ')}
            />
          </svg>
        </div>
        <div className="flex justify-between text-[10px] text-muted mt-2">
          <span>{fmtDate(days[0].date)}</span>
          <span>{fmtDate(days[days.length - 1].date)}</span>
        </div>
      </div>

      {/* Assumption strip */}
      <div className="card p-4 mb-3">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Forecast assumptions</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted text-[11px]">Starting cash</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{cashSet ? fmtR0(forecast.startingCash) : '—'}</p>
            {cashBalanceUpdatedAt && <p className="text-muted text-[10px]">as of {new Date(cashBalanceUpdatedAt).toLocaleDateString('en-ZA')}</p>}
          </div>
          <div>
            <p className="text-muted text-[11px]">Avg daily revenue</p>
            <p className="text-sm font-semibold" style={{ color: '#00C896' }}>+{fmtR0(avgDailyRevenue)}/day</p>
            <p className="text-muted text-[10px]">last 7 days</p>
          </div>
          <div>
            <p className="text-muted text-[11px]">Avg daily variable expense</p>
            <p className="text-sm font-semibold" style={{ color: '#F97316' }}>−{fmtR0(avgDailyVariableExpense)}/day</p>
            <p className="text-muted text-[10px]">last 30 days</p>
          </div>
          <div>
            <p className="text-muted text-[11px]">Confirmed dues (window)</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              <span style={{ color: '#00C896' }}>+{fmtR0(forecast.totalConfirmedInflow)}</span>
              {' / '}
              <span style={{ color: '#EF4444' }}>−{fmtR0(forecast.totalConfirmedOutflow)}</span>
            </p>
            <p className="text-muted text-[10px]">invoices / bills + recurring</p>
          </div>
        </div>
      </div>

      {/* Day-by-day list — only days with confirmed activity to keep noise low */}
      <div className="card p-4 mb-4">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">Confirmed events</p>
        {days.filter(d => d.confirmedInflow > 0 || d.confirmedOutflow > 0).length === 0 ? (
          <p className="text-muted text-sm">No invoice dues, supplier bills or recurring rules in the next 30 days.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {days.filter(d => d.confirmedInflow > 0 || d.confirmedOutflow > 0).map(d => (
              <div key={d.date} className="flex items-center justify-between py-1.5" style={{ borderTop: '1px solid var(--card-border)' }}>
                <span className="text-sm" style={{ color: 'var(--foreground)' }}>{fmtDate(d.date)}</span>
                <span className="text-sm">
                  {d.confirmedInflow > 0 && <span style={{ color: '#00C896' }}>+{fmtR0(d.confirmedInflow)} </span>}
                  {d.confirmedOutflow > 0 && <span style={{ color: '#EF4444' }}>−{fmtR0(d.confirmedOutflow)} </span>}
                  <span className="text-muted text-xs">→ {fmtR0(d.runningBalance)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4 mb-4">
        <p className="text-muted text-xs leading-relaxed">
          The forecast assumes today&apos;s trading rhythm continues. Variable inflow uses your last
          7-day average; variable outflow uses your last 30-day average. Confirmed dues
          (invoices, supplier bills, recurring rules) land on their scheduled dates.
          Update <Link href="/settings/store" className="underline">cash on hand</Link> when
          you cash up to keep this honest.
        </p>
      </div>
    </>
  )
}
