'use client'

import { useState } from 'react'
import { PaymentMethod, PAYMENT_METHODS } from '@/domain/entities/sale'

interface Props {
  expectedCash: number
  totalRevenue: number
  totalProfit: number
  totalExpenses: number
  salesCount: number
  itemsSold: number
  byMethod: Record<string, number>
}

export default function CashUpClient({
  expectedCash,
  totalRevenue,
  totalProfit,
  totalExpenses,
  salesCount,
  itemsSold,
  byMethod,
}: Props) {
  const [actualCash, setActualCash] = useState('')
  const actual = parseFloat(actualCash) || 0
  const diff = actual - expectedCash
  const hasInput = actualCash.trim() !== ''
  const netProfit = totalProfit - totalExpenses

  const methodEntries = PAYMENT_METHODS
    .map(m => ({ ...m, amount: byMethod[m.value] ?? 0 }))
    .filter(m => m.amount !== 0)

  return (
    <>
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>End-of-Day Cash Up</h1>
      <p className="text-muted text-sm mb-5">Today · {new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4">
          <p className="text-muted text-xs uppercase">Revenue</p>
          <p className="font-bold text-xl mt-1" style={{ color: 'var(--foreground)' }}>R{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs uppercase">Profit</p>
          <p className="text-brand font-bold text-xl mt-1">R{totalProfit.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs uppercase">Expenses</p>
          <p className="text-orange-400 font-bold text-xl mt-1">R{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs uppercase">Sales · Items</p>
          <p className="font-bold text-xl mt-1" style={{ color: 'var(--foreground)' }}>{salesCount} · {itemsSold}</p>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <p className="text-muted text-xs uppercase">Net Profit</p>
        <p className={`font-bold text-2xl mt-1 ${netProfit >= 0 ? 'text-brand' : 'text-danger'}`}>R{netProfit.toFixed(2)}</p>
      </div>

      {methodEntries.length > 0 && (
        <div className="card p-4 mb-4">
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3">Revenue by payment method</p>
          <div className="flex flex-col gap-2">
            {methodEntries.map(m => (
              <div key={m.value} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--foreground)' }}>{m.label}</span>
                <span className={`text-sm font-semibold ${m.amount < 0 ? 'text-danger' : ''}`} style={m.amount < 0 ? {} : { color: 'var(--foreground)' }}>
                  R{m.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-muted text-xs mt-3">Card / SnapScan / Yoco / EFT settle to your bank — only cash should be in the till.</p>
        </div>
      )}

      <div className="card p-5 mb-4">
        <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Count the cash drawer</p>
        <p className="text-muted text-sm mb-4">
          Expected: <span className="text-brand font-semibold">R{expectedCash.toFixed(2)}</span>
        </p>
        <input
          type="number"
          step="0.01"
          min="0"
          value={actualCash}
          onChange={e => setActualCash(e.target.value)}
          placeholder="R 0.00"
          className="input text-center text-lg"
        />
        {hasInput && (
          <div
            className="card p-4 mt-4"
            style={{
              borderColor: diff === 0 ? '#1E4D3F' : diff > 0 ? '#1E3A5F' : '#4D1F23',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase">Counted</p>
                <p className="font-bold" style={{ color: 'var(--foreground)' }}>R{actual.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted uppercase">Difference</p>
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
