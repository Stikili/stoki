'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { type RecurringExpense, type RecurringFrequency } from '@/domain/entities/recurring-expense'
import { EXPENSE_CATEGORIES } from '@/domain/entities/expense'
import { type Store } from '@/domain/entities/store'
import { Plus, Trash2, Calendar } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import {
  createRecurringAction,
  toggleRecurringAction,
  archiveRecurringAction,
} from './actions'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmtMoney(n: number) { return `R${n.toFixed(2)}` }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ruleSummary(rule: RecurringExpense): string {
  if (rule.frequency === 'weekly') return `Every ${WEEKDAYS[rule.dayValue]}`
  const suffix = rule.dayValue === 1 ? 'st' : rule.dayValue === 2 ? 'nd' : rule.dayValue === 3 ? 'rd' : 'th'
  return `Monthly on the ${rule.dayValue}${suffix}`
}

const fieldStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '14px 16px',
  color: 'var(--foreground)',
  fontSize: '16px',
  outline: 'none',
  width: '100%',
} as const

export default function RecurringClient({
  store: _store,
  rules,
}: {
  store: Store
  rules: RecurringExpense[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleAdd(input: {
    category: string
    description: string
    amount: number
    isCapital: boolean
    frequency: RecurringFrequency
    dayValue: number
  }) {
    startTransition(async () => {
      const res = await createRecurringAction(input)
      if (res.ok) {
        haptic(20)
        toast('Recurring rule added')
        setShowAdd(false)
        router.refresh()
      } else {
        toast(res.error ?? 'Failed to add rule')
      }
    })
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      const res = await toggleRecurringAction(id, !active)
      if (res.ok) router.refresh()
      else toast(res.error ?? 'Failed')
    })
  }

  function handleArchive(id: string) {
    if (!confirm('Stop this rule from spawning expenses? Existing expenses already posted are kept.')) return
    startTransition(async () => {
      const res = await archiveRecurringAction(id)
      if (res.ok) { toast('Rule removed'); router.refresh() }
      else toast(res.error ?? 'Failed')
    })
  }

  if (showAdd) {
    return <AddForm onCancel={() => setShowAdd(false)} onSubmit={handleAdd} isPending={isPending} />
  }

  return (
    <>
      <button
        onClick={() => setShowAdd(true)}
        className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm w-auto"
      >
        <Plus size={14} /> Add recurring rule
      </button>

      {rules.length === 0 ? (
        <EmptyState
          icon={<Calendar />}
          tone="amber"
          title="No recurring rules yet"
          description="Add rent, electricity, insurance, or weekly transport — each will spawn an expense on schedule and feed your cash-flow forecast."
        />
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {rules.map((rule) => (
            <div key={rule.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {rule.description}
                  </p>
                  <p className="text-muted text-xs mt-0.5">
                    {ruleSummary(rule)} · {fmtMoney(rule.amount)} · next {fmtDate(rule.nextDueAt)}
                    {!rule.active && ' · paused'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule.id, rule.active)}
                    disabled={isPending}
                    className="rounded-xl px-3 py-2 text-xs font-semibold"
                    style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
                  >
                    {rule.active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleArchive(rule.id)}
                    disabled={isPending}
                    className="rounded-xl p-2"
                    style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: '#EF4444' }}
                    aria-label="Remove rule"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function AddForm({
  onCancel,
  onSubmit,
  isPending,
}: {
  onCancel: () => void
  onSubmit: (input: {
    category: string
    description: string
    amount: number
    isCapital: boolean
    frequency: RecurringFrequency
    dayValue: number
  }) => void
  isPending: boolean
}) {
  const [category, setCategory] = useState('rent')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [isCapital, setIsCapital] = useState(false)
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [dayValue, setDayValue] = useState('1')

  const amt = parseFloat(amount)
  const day = parseInt(dayValue, 10)
  const canSubmit = description.trim().length > 0
    && Number.isFinite(amt) && amt > 0
    && Number.isFinite(day)
    && (frequency === 'monthly' ? day >= 1 && day <= 31 : day >= 0 && day <= 6)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Category</p>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle}>
          {EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Description</p>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shop rent"
          style={fieldStyle}
        />
      </div>
      <div>
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Amount (R)</p>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={fieldStyle}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">Frequency</p>
          <select
            value={frequency}
            onChange={(e) => {
              const v = e.target.value as RecurringFrequency
              setFrequency(v)
              setDayValue(v === 'weekly' ? '1' : '1')
            }}
            style={fieldStyle}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2">
            {frequency === 'monthly' ? 'Day of month' : 'Day of week'}
          </p>
          {frequency === 'monthly' ? (
            <input
              type="number"
              min="1"
              max="31"
              value={dayValue}
              onChange={(e) => setDayValue(e.target.value)}
              style={fieldStyle}
            />
          ) : (
            <select value={dayValue} onChange={(e) => setDayValue(e.target.value)} style={fieldStyle}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          )}
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
        <div>
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>Capital purchase</p>
          <p className="text-muted text-[10px] mt-0.5">Goes to VAT201 block 14 instead of 15.</p>
        </div>
        <input type="checkbox" checked={isCapital} onChange={(e) => setIsCapital(e.target.checked)} className="w-5 h-5 accent-brand" />
      </label>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <button onClick={onCancel} disabled={isPending} className="rounded-xl py-3 font-semibold text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit({ category, description: description.trim(), amount: amt, isCapital, frequency, dayValue: day })}
          disabled={!canSubmit || isPending}
          className="btn-primary"
        >
          {isPending ? 'Saving…' : 'Save rule'}
        </button>
      </div>
    </div>
  )
}
