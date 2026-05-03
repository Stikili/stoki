'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Settings as SettingsIcon, Store as StoreIcon, LogOut, ShieldCheck } from 'lucide-react'
import { createClient } from '@/infrastructure/supabase/client'

/**
 * Account / settings entry point. Renders as a small icon in the dashboard
 * header — tap opens a header-anchored slide-down dropdown with categorised
 * destinations. Closes on outside click, Esc, or item-click. Animates with
 * a translateY+opacity transition so the panel reads as "dropped from the
 * gear" rather than a floating card.
 */
export default function UserMenu({
  storeName,
  storeCount,
}: {
  storeName: string
  storeCount: number
}) {
  const [open, setOpen] = useState(false)
  // Track mounted/visible separately so we can play the close transition.
  // Otherwise React unmounts the panel before the transform finishes.
  const [visible, setVisible] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  function close() {
    setVisible(false)
    setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => setVisible(true))
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    function onPointer(e: Event) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('touchstart', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('touchstart', onPointer)
    }
  }, [open])

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Open settings menu"
        aria-expanded={open}
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: open ? 'var(--surface)' : 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <SettingsIcon size={18} color="#7B8CA1" strokeWidth={1.75} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-72 rounded-2xl overflow-hidden z-[60] origin-top-right"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
            opacity: visible ? 1 : 0,
            transition: 'transform 150ms ease-out, opacity 150ms ease-out',
          }}
        >
          <div className="px-4 pt-3.5 pb-2.5">
            <p className="text-[10px] uppercase tracking-widest text-muted">Current store</p>
            <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--foreground)' }}>{storeName}</p>
          </div>

          <MenuItem
            href="/settings"
            onNavigate={close}
            icon={<SettingsIcon size={16} color="#7B8CA1" strokeWidth={1.75} />}
            label="Store settings"
            hint="VAT, team, business details"
          />
          <MenuItem
            href="/stores"
            onNavigate={close}
            icon={<StoreIcon size={16} color="#7B8CA1" strokeWidth={1.75} />}
            label={storeCount > 1 ? 'Switch store' : 'Add another store'}
            hint={storeCount > 1 ? `${storeCount} stores` : 'Create a second store'}
          />
          <MenuItem
            href="/privacy"
            onNavigate={close}
            icon={<ShieldCheck size={16} color="#7B8CA1" strokeWidth={1.75} />}
            label="Privacy policy"
          />

          <div className="px-3 pt-2 pb-3" style={{ borderTop: '1px solid var(--card-border)' }}>
            <button
              onClick={signOut}
              disabled={signingOut}
              role="menuitem"
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-danger inline-flex items-center justify-center gap-2"
              style={{ background: '#2D1518', border: '1px solid #4D1F23', opacity: signingOut ? 0.6 : 1 }}
            >
              <LogOut size={14} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  href,
  onNavigate,
  icon,
  label,
  hint,
}: {
  href: string
  onNavigate: () => void
  icon: React.ReactNode
  label: string
  hint?: string
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-2.5 active:bg-white/[0.04] hover:bg-white/[0.02]"
      style={{ borderTop: '1px solid var(--card-border)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</p>
        {hint && <p className="text-muted text-[11px] mt-0.5 truncate">{hint}</p>}
      </div>
    </Link>
  )
}
