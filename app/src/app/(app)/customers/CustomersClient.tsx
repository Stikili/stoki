'use client'

import { Debtor } from '@/domain/entities/debtor'

const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 20px rgba(0,0,0,0.25)' }

export default function CustomersClient({
  debtors, totalSalesCount, totalRevenue, debtorCount,
}: {
  debtors: Debtor[]; totalSalesCount: number; totalRevenue: number; debtorCount: number
}) {
  const owing = debtors.filter((d) => d.totalOwed > 0)
  const totalOwed = owing.reduce((s, d) => s + d.totalOwed, 0)

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-5">Customer Insights</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-muted text-xs uppercase tracking-wide">30d Sales</p>
          <p className="text-white font-bold text-xl mt-1">{totalSalesCount}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-muted text-xs uppercase tracking-wide">30d Revenue</p>
          <p className="text-brand font-bold text-xl mt-1">R{totalRevenue.toFixed(0)}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-muted text-xs uppercase tracking-wide">Credit Customers</p>
          <p className="text-white font-bold text-xl mt-1">{debtorCount}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-muted text-xs uppercase tracking-wide">Total Owed</p>
          <p className="text-danger font-bold text-xl mt-1">R{totalOwed.toFixed(0)}</p>
        </div>
      </div>

      {/* Top debtors */}
      {owing.length > 0 && (
        <>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">Top Debtors</p>
          <div className="flex flex-col gap-2 mb-5">
            {owing.slice(0, 10).map((d, i) => (
              <div key={d.id} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={cardStyle}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: i < 3 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: i < 3 ? '#ef4444' : '#5a7a94' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{d.name}</p>
                  {d.phone && <p className="text-muted text-xs">{d.phone}</p>}
                </div>
                <p className="text-danger font-bold flex-shrink-0">R{d.totalOwed.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Loyal customers (those who have cleared debt before) */}
      {debtors.filter((d) => d.totalOwed === 0).length > 0 && (
        <>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">Clear Accounts</p>
          <div className="flex flex-col gap-2">
            {debtors.filter((d) => d.totalOwed === 0).map((d) => (
              <div key={d.id} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={cardStyle}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'rgba(0,200,150,0.12)', color: '#00C896' }}>✓</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{d.name}</p>
                  {d.phone && <p className="text-muted text-xs">{d.phone}</p>}
                </div>
                <p className="text-brand font-semibold text-sm">R0.00</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
