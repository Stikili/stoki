'use client'

import { useState } from 'react'

export default function CashUpClient({ expectedCash, totalProfit, totalExpenses, salesCount, itemsSold }: { expectedCash: number; totalProfit: number; totalExpenses: number; salesCount: number; itemsSold: number }) {
  const [actualCash, setActualCash] = useState('')
  const actual = parseFloat(actualCash) || 0
  const diff = actual - expectedCash
  const hasInput = actualCash.trim() !== ''

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-5">End-of-Day Cash Up</h1>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4"><p className="text-muted text-xs uppercase">Revenue</p><p className="text-white font-bold text-xl mt-1">R{expectedCash.toFixed(2)}</p></div>
        <div className="card p-4"><p className="text-muted text-xs uppercase">Profit</p><p className="text-brand font-bold text-xl mt-1">R{totalProfit.toFixed(2)}</p></div>
        <div className="card p-4"><p className="text-muted text-xs uppercase">Expenses</p><p className="text-orange-400 font-bold text-xl mt-1">R{totalExpenses.toFixed(2)}</p></div>
        <div className="card p-4"><p className="text-muted text-xs uppercase">Sales</p><p className="text-white font-bold text-xl mt-1">{salesCount}</p></div>
      </div>

      <div className="card p-4 mb-5">
        <p className="text-muted text-xs uppercase">Net Profit</p>
        <p className={`font-bold text-2xl mt-1 ${(totalProfit - totalExpenses) >= 0 ? 'text-brand' : 'text-danger'}`}>R{(totalProfit - totalExpenses).toFixed(2)}</p>
      </div>

      <div className="card p-5 mb-4">
        <p className="text-white font-semibold mb-1">Count your cash</p>
        <p className="text-muted text-sm mb-4">Enter how much is in the drawer</p>
        <input type="number" step="0.01" min="0" value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="R 0.00" className="input text-center text-lg" />
        {hasInput && (
          <div className={`card p-4 mt-4 ${diff === 0 ? 'border-brand' : diff > 0 ? 'border-blue-500' : 'border-danger'}`} style={{ borderColor: diff === 0 ? '#1E4D3F' : diff > 0 ? '#1E3A5F' : '#4D1F23' }}>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted uppercase">Expected</p><p className="text-white font-bold">R{expectedCash.toFixed(2)}</p></div>
              <div className="text-right"><p className="text-xs text-muted uppercase">Difference</p>
                <p className={`font-bold text-lg ${diff === 0 ? 'text-brand' : diff > 0 ? 'text-blue-400' : 'text-danger'}`}>
                  {diff === 0 ? 'Perfect!' : diff > 0 ? `+R${diff.toFixed(2)} over` : `-R${Math.abs(diff).toFixed(2)} short`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
