'use client'

import { Debtor } from '@/domain/entities/debtor'

export default function CustomersClient({ debtors, totalSalesCount, totalRevenue, debtorCount }: { debtors: Debtor[]; totalSalesCount: number; totalRevenue: number; debtorCount: number }) {
  const owing = debtors.filter(d => d.totalOwed > 0)
  const totalOwed = owing.reduce((s, d) => s + d.totalOwed, 0)

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-5">Customer Insights</h1>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4"><p className="text-muted text-xs uppercase">30d Sales</p><p className="text-white font-bold text-xl mt-1">{totalSalesCount}</p></div>
        <div className="card p-4"><p className="text-muted text-xs uppercase">30d Revenue</p><p className="text-brand font-bold text-xl mt-1">R{totalRevenue.toFixed(0)}</p></div>
        <div className="card p-4"><p className="text-muted text-xs uppercase">Customers</p><p className="text-white font-bold text-xl mt-1">{debtorCount}</p></div>
        <div className="card p-4"><p className="text-muted text-xs uppercase">Total Owed</p><p className="text-danger font-bold text-xl mt-1">R{totalOwed.toFixed(0)}</p></div>
      </div>

      {owing.length > 0 && (
        <>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">Top Debtors</p>
          <div className="flex flex-col gap-2 mb-5">
            {owing.slice(0, 10).map((d, i) => (
              <div key={d.id} className="card px-4 py-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: i < 3 ? '#2D1518' : '#1A2236', color: i < 3 ? '#EF4444' : '#8896AB' }}>{i+1}</span>
                <div className="flex-1 min-w-0"><p className="text-white font-semibold text-sm truncate">{d.name}</p>{d.phone && <p className="text-muted text-xs">{d.phone}</p>}</div>
                <p className="text-danger font-bold flex-shrink-0">R{d.totalOwed.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {debtors.filter(d => d.totalOwed === 0).length > 0 && (
        <>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">Clear Accounts</p>
          <div className="flex flex-col gap-2">
            {debtors.filter(d => d.totalOwed === 0).map(d => (
              <div key={d.id} className="card px-4 py-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: '#143328', color: '#00C896' }}>✓</span>
                <div className="flex-1 min-w-0"><p className="text-white font-semibold text-sm truncate">{d.name}</p></div>
                <p className="text-brand font-semibold text-sm">R0.00</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
