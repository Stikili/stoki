'use client'

import { useState } from 'react'

const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 20px rgba(0,0,0,0.25)' }
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '14px', padding: '14px 16px', fontSize: '18px', outline: 'none', width: '100%', textAlign: 'center' as const }

export default function CashUpClient({
  expectedCash, totalProfit, totalExpenses, salesCount, itemsSold,
}: {
  expectedCash: number; totalProfit: number; totalExpenses: number; salesCount: number; itemsSold: number
}) {
  const [actualCash, setActualCash] = useState('')
  const actual = parseFloat(actualCash) || 0
  const diff = actual - expectedCash
  const hasInput = actualCash.trim() !== ''

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-5">End-of-Day Cash Up</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-muted text-xs uppercase tracking-wide">Revenue</p>
          <p className="text-white font-bold text-xl mt-1">R{expectedCash.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-muted text-xs uppercase tracking-wide">Profit</p>
          <p className="text-brand font-bold text-xl mt-1">R{totalProfit.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-muted text-xs uppercase tracking-wide">Expenses</p>
          <p className="text-orange-400 font-bold text-xl mt-1">R{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-muted text-xs uppercase tracking-wide">Sales</p>
          <p className="text-white font-bold text-xl mt-1">{salesCount} ({itemsSold} items)</p>
        </div>
      </div>

      {/* Net P&L */}
      <div className="rounded-2xl p-4 mb-5" style={cardStyle}>
        <p className="text-muted text-xs uppercase tracking-wide">Net Profit (after expenses)</p>
        <p className="font-bold text-2xl mt-1" style={{ color: (totalProfit - totalExpenses) >= 0 ? '#00C896' : '#ef4444' }}>
          R{(totalProfit - totalExpenses).toFixed(2)}
        </p>
      </div>

      {/* Cash count input */}
      <div className="rounded-3xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-white font-semibold mb-1">Count your cash</p>
        <p className="text-muted text-sm mb-4">Enter how much money is in the drawer</p>
        <input
          type="number"
          step="0.01"
          min="0"
          value={actualCash}
          onChange={(e) => setActualCash(e.target.value)}
          placeholder="R 0.00"
          style={inputStyle}
        />

        {hasInput && (
          <div className="mt-4 rounded-2xl p-4" style={diff === 0
            ? { background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)' }
            : diff > 0
              ? { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }
              : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }
          }>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase">Expected</p>
                <p className="text-white font-bold">R{expectedCash.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted uppercase">Difference</p>
                <p className="font-bold text-lg" style={{ color: diff === 0 ? '#00C896' : diff > 0 ? '#60a5fa' : '#ef4444' }}>
                  {diff === 0 ? 'Perfect!' : diff > 0 ? `+R${diff.toFixed(2)} over` : `-R${Math.abs(diff).toFixed(2)} short`}
                </p>
              </div>
            </div>
            {diff !== 0 && (
              <p className="text-muted text-xs mt-2">
                {diff > 0 ? 'You have more than expected — check for unrecorded income.' : 'You have less than expected — check for unrecorded expenses or missing sales.'}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
