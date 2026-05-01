'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ChecklistItem {
  key: string
  label: string
  done: boolean
  href: string
  cta: string
}

const DISMISS_KEY = 'stoki_setup_dismissed'

export default function SetupChecklist({
  storeId,
  items,
}: {
  storeId: string
  items: ChecklistItem[]
}) {
  const [visible, setVisible] = useState(false)

  // Hydrate dismissed flag from localStorage; setState-in-effect is the
  // canonical SSR-safe pattern for browser-only state.
  useEffect(() => {
    const dismissed = localStorage.getItem(`${DISMISS_KEY}_${storeId}`)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dismissed) setVisible(true)
  }, [storeId])

  const allDone = items.every((i) => i.done)
  const doneCount = items.filter((i) => i.done).length

  // Auto-dismiss when all items complete
  useEffect(() => {
    if (allDone && visible) {
      const t = setTimeout(() => {
        localStorage.setItem(`${DISMISS_KEY}_${storeId}`, '1')
        setVisible(false)
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [allDone, visible, storeId])

  if (!visible) return null

  const nextItem = items.find((i) => !i.done)

  return (
    <div
      className="card rounded-2xl p-4 relative overflow-hidden"
      style={{ borderColor: 'rgba(0,200,150,0.18)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {allDone ? 'You\'re all set! 🎉' : 'Get set up'}
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(`${DISMISS_KEY}_${storeId}`, '1')
            setVisible(false)
          }}
          className="text-muted text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${(doneCount / items.length) * 100}%`,
            background: '#00C896',
          }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1.5 mb-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={item.done
                ? { background: '#00C896' }
                : { background: 'var(--surface)', border: '1px solid var(--card-border)' }
              }
            >
              {item.done && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="var(--btn-primary-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="text-sm" style={{ color: item.done ? 'var(--muted)' : 'var(--foreground)', textDecoration: item.done ? 'line-through' : 'none' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Next action CTA */}
      {nextItem && (
        <Link
          href={nextItem.href}
          className="flex items-center justify-between rounded-xl px-4 py-2.5"
          style={{ background: 'var(--pill-green-bg)', border: '1px solid var(--card-border)' }}
        >
          <span className="text-brand text-sm font-semibold">{nextItem.cta}</span>
          <span className="text-brand">›</span>
        </Link>
      )}
    </div>
  )
}
