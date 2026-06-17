'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Expense, EXPENSE_CATEGORIES } from '@/domain/entities/expense'
import { addExpenseAction, deleteExpenseAction } from './actions'
import { useToast } from '@/components/Toast'
import { Plus, Wallet, Repeat } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default function ExpensesClient({ expenses, totalThisMonth }: { expenses: Expense[]; totalThisMonth: number }) {
  const { toast, toastUndo } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleAdd(fd: FormData) { startTransition(async () => { await addExpenseAction(fd); setShowAdd(false); toast('Expense recorded') }) }
  function handleDelete(e: Expense) {
    startTransition(async () => {
      await deleteExpenseAction(e.id)
      toastUndo(`Deleted R${e.amount.toFixed(2)}`, () => { const fd = new FormData(); fd.set('category', e.category); fd.set('description', e.description); fd.set('amount', String(e.amount)); startTransition(() => addExpenseAction(fd)) })
    })
  }
  const catLabel = (key: string) => EXPENSE_CATEGORIES.find(c => c.key === key)?.label ?? key

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Expenses</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/settings/recurring"
            className="rounded-xl px-3 h-11 inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
          >
            <Repeat size={14} /> Recurring
          </Link>
          <button onClick={() => setShowAdd(true)} className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#F97316' }}>
            <Plus size={20} color="white" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">This Month</p>
        <p className="text-3xl font-bold text-orange-400">R{totalThisMonth.toFixed(2)}</p>
        <p className="text-muted text-sm mt-1">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={<Wallet />}
          tone="amber"
          title="No expenses this month"
          description="Track rent, transport, airtime and other costs so your P&L tells the whole story."
          pointToAction
        />
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map(e => (
            <div key={e.id} className="card px-4 py-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{e.description}</p>
                <p className="text-muted text-xs mt-0.5">{catLabel(e.category)} · {new Date(e.recordedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <p className="text-orange-400 font-bold">R{e.amount.toFixed(2)}</p>
                <button onClick={() => handleDelete(e)} className="w-7 h-7 rounded-full flex items-center justify-center text-xs min-h-0" style={{ background: '#2D1518', color: '#EF4444' }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end"><div className="absolute inset-0 bg-black/70" onClick={() => setShowAdd(false)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet"><div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-5">Add Expense</h2>
            <form action={handleAdd} className="flex flex-col gap-3">
              <select name="category" required className="input">{EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
              <input name="description" placeholder="Description *" required className="input" />
              <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (R) *" required className="input" />
              <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                <div>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>Capital purchase</p>
                  <p className="text-muted text-[10px] mt-0.5">Fridge, till, vehicle — goes to VAT201 block 14 instead of 15.</p>
                </div>
                <input type="checkbox" name="isCapital" className="w-5 h-5 accent-brand" />
              </label>
              <button type="submit" disabled={isPending} className="btn-primary mt-2" style={{ background: '#F97316' }}>{isPending ? 'Saving…' : 'Add Expense'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
