'use client'

import { useState, useTransition } from 'react'
import { Expense, EXPENSE_CATEGORIES } from '@/domain/entities/expense'
import { addExpenseAction, deleteExpenseAction } from './actions'
import { useToast } from '@/components/Toast'

const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 20px rgba(0,0,0,0.25)' }
const sheetStyle = { background: 'rgba(8,18,32,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.1)' }
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '14px', padding: '14px 16px', fontSize: '15px', outline: 'none', width: '100%' }

export default function ExpensesClient({ expenses, totalThisMonth }: { expenses: Expense[]; totalThisMonth: number }) {
  const { toast, toastUndo } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await addExpenseAction(formData)
      setShowAdd(false)
      toast('Expense recorded')
    })
  }

  function handleDelete(e: Expense) {
    startTransition(async () => {
      await deleteExpenseAction(e.id)
      toastUndo(`Deleted R${e.amount.toFixed(2)} ${e.description}`, () => {
        const fd = new FormData()
        fd.set('category', e.category)
        fd.set('description', e.description)
        fd.set('amount', String(e.amount))
        startTransition(() => addExpenseAction(fd))
      })
    })
  }

  const catLabel = (key: string) => EXPENSE_CATEGORIES.find((c) => c.key === key)?.label ?? key

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Expenses</h1>
        <button onClick={() => setShowAdd(true)} className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 0 20px rgba(249,115,22,0.4)', color: 'white' }}>+</button>
      </div>

      {/* Monthly total */}
      <div className="rounded-3xl p-5 mb-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(180,60,10,0.06) 100%)', border: '1px solid rgba(249,115,22,0.25)' }}>
        <p className="text-orange-400/70 text-xs font-semibold uppercase tracking-widest mb-2">This Month</p>
        <p className="text-3xl font-bold" style={{ background: 'linear-gradient(135deg, #fb923c, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          R{totalThisMonth.toFixed(2)}
        </p>
        <p className="text-muted text-sm mt-1">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={cardStyle}><span className="text-3xl">💸</span></div>
          <p className="text-white font-semibold mb-1">No expenses this month</p>
          <p className="text-muted text-sm">Tap + to record rent, transport, airtime, etc.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map((e) => (
            <div key={e.id} className="rounded-2xl px-4 py-3 flex items-center justify-between" style={cardStyle}>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{e.description}</p>
                <p className="text-muted text-xs mt-0.5">{catLabel(e.category)} · {new Date(e.recordedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <p className="text-orange-400 font-bold">R{e.amount.toFixed(2)}</p>
                <button onClick={() => handleDelete(e)} className="w-7 h-7 rounded-full flex items-center justify-center text-xs min-h-0"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add expense sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAdd(false)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-5">Add Expense</h2>
            <form action={handleAdd} className="flex flex-col gap-3">
              <select name="category" required style={{ ...inputStyle, appearance: 'none' }}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <input name="description" placeholder="Description *" required style={inputStyle} />
              <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (R) *" required style={inputStyle} />
              <button type="submit" disabled={isPending}
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '14px', padding: '14px', color: 'white', fontWeight: 700, fontSize: '15px', width: '100%', marginTop: '8px', opacity: isPending ? 0.6 : 1 }}>
                {isPending ? 'Saving…' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
