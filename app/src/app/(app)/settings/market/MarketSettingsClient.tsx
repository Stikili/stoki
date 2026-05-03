'use client'

import { useState, useTransition } from 'react'
import { saveMarketIndicatorAction } from './actions'
import {
  MarketIndicatorKind,
  MARKET_INDICATOR_KINDS,
  MARKET_INDICATOR_LABELS,
  MarketIndicator,
} from '@/domain/entities/market-indicator'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'

const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '16px',
}

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '12px 14px',
  color: 'var(--foreground)',
  fontSize: '15px',
  outline: 'none',
  width: '100%',
} as const

export default function MarketSettingsClient({
  latest,
}: {
  latest: Partial<Record<MarketIndicatorKind, MarketIndicator>>
}) {
  return (
    <div className="flex flex-col gap-3">
      {MARKET_INDICATOR_KINDS.map((kind) => (
        <IndicatorCard key={kind} kind={kind} current={latest[kind] ?? null} />
      ))}
    </div>
  )
}

function IndicatorCard({
  kind,
  current,
}: {
  kind: MarketIndicatorKind
  current: MarketIndicator | null
}) {
  const { toast } = useToast()
  const [value, setValue] = useState(current ? String(current.value) : '')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const dirty = parseFloat(value) !== current?.value && value.trim() !== ''

  function handleSave() {
    const n = parseFloat(value)
    if (!Number.isFinite(n)) {
      toast('Value must be a number', 'error')
      return
    }
    startTransition(async () => {
      const result = await saveMarketIndicatorAction(kind, n, notes.trim() || undefined)
      if (!result.ok) {
        toast(result.error ?? 'Save failed', 'error')
        return
      }
      haptic(40)
      toast(`${MARKET_INDICATOR_LABELS[kind]} updated`)
      setNotes('')
    })
  }

  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{MARKET_INDICATOR_LABELS[kind]}</p>
          {current && (
            <p className="text-muted text-xs mt-0.5">
              Current: <span className="text-brand font-semibold">{current.value}</span>
              {' · '}{current.source}
              {' · '}{(current.measuredAt ?? current.fetchedAt).slice(0, 10)}
            </p>
          )}
          {!current && <p className="text-muted text-xs mt-0.5">No value yet — uses hardcoded baseline.</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="number"
          step="0.01"
          placeholder="New value"
          style={inputStyle}
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional, e.g. 'Post-MPC announcement 14 May 2026')"
          style={inputStyle}
        />
        <button
          onClick={handleSave}
          disabled={!dirty || isPending}
          className="rounded-xl py-2.5 font-semibold text-sm"
          style={{
            background: dirty && !isPending ? '#00C896' : '#1A2236',
            color: dirty && !isPending ? '#0A0E17' : '#5A6B80',
          }}
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
