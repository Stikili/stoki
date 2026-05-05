'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Store } from '@/domain/entities/store'
import { switchStoreAction } from '@/app/actions/switchStore'
import { Bell, ChevronDown, Check, Search } from 'lucide-react'
import Logo from '@/components/Logo'
import UserMenu from '@/components/UserMenu'
import { useI18n } from '@/lib/i18n'

const MUTED = '#7B8CA1';

export default function StoreHeader({
  store, allStores, unreadAlerts = 0,
}: {
  store: Store; allStores: Store[]; unreadAlerts?: number
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { t } = useI18n()
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
            <Logo size={16} color="white" />
          </div>
          <span className="font-semibold text-sm truncate max-w-[160px]" style={{ color: 'var(--foreground)' }}>{store.name}</span>
          {store.isDemo && (
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: 'rgba(96,165,250,0.12)', color: '#7AB7FB', border: '1px solid rgba(96,165,250,0.25)' }}
            >
              Demo
            </span>
          )}
          {hasMultiple && <ChevronDown size={14} color={MUTED} strokeWidth={1.5} />}
        </button>

        <div className="flex items-center gap-2">
          {/* Search trigger — touch users have no Cmd+K. Dispatches a window
              event the globally-mounted CommandPalette listens for. */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('stoki:open-palette'))}
            aria-label="Search"
            className="flex items-center justify-center w-10 h-10 rounded-xl min-h-0"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Search size={18} color="#9DB0C5" strokeWidth={1.5} />
          </button>
          <Link href="/alerts" className="relative flex items-center justify-center w-10 h-10 rounded-xl min-h-0" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <Bell size={18} color="#9DB0C5" strokeWidth={1.5} />
            {unreadAlerts > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1" style={{ background: '#EF4444', color: 'white' }}>
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </div>
            )}
          </Link>
          {/* Single source of truth for the gear-icon dropdown — same instance
              everywhere in the app, no per-page duplicates. */}
          <UserMenu storeName={store.name} storeCount={allStores.length} />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--card-border)' }} />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{t('header.yourStores')}</h2>
              <Link href="/onboarding?new=1" onClick={() => setOpen(false)} className="text-brand text-sm font-semibold min-h-0">{t('header.newStore')}</Link>
            </div>
            <div className="flex flex-col gap-2">
              {allStores.map(s => {
                const active = s.id === store.id
                return (
                  <button key={s.id} onClick={() => select(s.id)} disabled={isPending}
                    className="w-full text-left rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform card"
                    style={active ? { background: 'var(--pill-green-bg)', borderColor: '#00C896' } : {}}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{ background: active ? '#00C896' : 'var(--surface)', color: active ? 'white' : MUTED }}>
                      {s.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`font-semibold truncate ${active ? 'text-brand' : ''}`} style={active ? {} : { color: 'var(--foreground)' }}>{s.name}</p>
                        {s.isDemo && (
                          <span
                            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: 'rgba(96,165,250,0.12)', color: '#7AB7FB', border: '1px solid rgba(96,165,250,0.25)' }}
                          >
                            Demo
                          </span>
                        )}
                      </div>
                    </div>
                    {active && <Check size={18} color="#00C896" strokeWidth={2.5} />}
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
