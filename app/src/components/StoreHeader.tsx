'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Store } from '@/domain/entities/store'
import { switchStoreAction } from '@/app/actions/switchStore'

export default function StoreHeader({
  store, allStores, unreadAlerts = 0,
}: {
  store: Store; allStores: Store[]; unreadAlerts?: number
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const hasMultiple = allStores.length > 1

  function select(id: string) {
    if (id === store.id) { setOpen(false); return }
    startTransition(async () => { await switchStoreAction(id); setOpen(false) })
  }

  return (
    <>
      <header className="flex items-center justify-between px-5 py-3 sticky top-0 z-40"
        style={{ background: 'var(--background)', borderBottom: '1px solid var(--card-border)' }}>
        <button onClick={() => hasMultiple && setOpen(true)}
          className="flex items-center gap-2.5 min-h-0"
          style={{ cursor: hasMultiple ? 'pointer' : 'default' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#00C896' }}>
            <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
              <polyline points="7,27 13,20 18,23 24,13 33,16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="33" cy="16" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="font-semibold text-sm truncate max-w-[160px]" style={{ color: 'var(--foreground)' }}>{store.name}</span>
          {hasMultiple && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>

        <div className="flex items-center gap-2">
          <Link href="/alerts" className="relative flex items-center justify-center w-10 h-10 rounded-xl min-h-0" style={{ background: 'var(--card-bg)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path d="M12 2a7 7 0 00-7 7v4l-2 3h18l-2-3V9a7 7 0 00-7-7z" stroke="var(--muted)" strokeWidth="1.75" strokeLinejoin="round"/>
              <path d="M10 19a2 2 0 004 0" stroke="var(--muted)" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            {unreadAlerts > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1"
                style={{ background: '#EF4444', color: 'white' }}>
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </div>
            )}
          </Link>
          <Link href="/settings" className="flex items-center justify-center w-10 h-10 rounded-xl min-h-0" style={{ background: 'var(--card-bg)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="var(--muted)" strokeWidth="1.75"/>
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="var(--muted)" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative rounded-t-3xl p-6 pb-10 sheet">
            <div className="w-12 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--card-border)' }} />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Your Stores</h2>
              <Link href="/onboarding?new=1" onClick={() => setOpen(false)} className="text-brand text-sm font-semibold min-h-0">+ New store</Link>
            </div>
            <div className="flex flex-col gap-2">
              {allStores.map(s => {
                const active = s.id === store.id
                return (
                  <button key={s.id} onClick={() => select(s.id)} disabled={isPending}
                    className="w-full text-left rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform card"
                    style={active ? { background: 'var(--pill-green-bg)', borderColor: '#00C896' } : {}}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{ background: active ? '#00C896' : 'var(--surface)', color: active ? 'var(--btn-primary-text)' : 'var(--muted)' }}>
                      {s.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${active ? 'text-brand' : ''}`} style={active ? {} : { color: 'var(--foreground)' }}>{s.name}</p>
                    </div>
                    {active && <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#00C896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
