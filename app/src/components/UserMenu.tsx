'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings as SettingsIcon, Store as StoreIcon, LogOut, ShieldCheck, ChevronRight } from 'lucide-react'
import { createClient } from '@/infrastructure/supabase/client'

/**
 * Account / settings entry point. Renders as a small icon in the dashboard
 * header — tap opens a bottom-sheet menu with categorised destinations
 * (Settings, Switch Store, Sign out, Privacy). Replaces the previous full-page
 * Settings tile in the feature grid; keeps the surface consistent with the
 * rest of the app's bottom-sheet UX rather than adding a desktop-style popover.
 */
export default function UserMenu({
  storeName,
  storeCount,
}: {
  storeName: string
  storeCount: number
}) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <SettingsIcon size={18} color="#7B8CA1" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative rounded-t-3xl pt-2 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto my-3" />

            <div className="px-5 pb-3">
              <p className="text-xs uppercase tracking-widest text-muted">Current store</p>
              <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--foreground)' }}>{storeName}</p>
            </div>

            <nav className="flex flex-col">
              <MenuLink
                href="/settings"
                onNavigate={() => setOpen(false)}
                icon={<SettingsIcon size={18} color="#7B8CA1" strokeWidth={1.75} />}
                label="Store settings"
                hint="VAT, team, business details"
              />
              <MenuLink
                href="/stores"
                onNavigate={() => setOpen(false)}
                icon={<StoreIcon size={18} color="#7B8CA1" strokeWidth={1.75} />}
                label={storeCount > 1 ? 'Switch store' : 'Add another store'}
                hint={storeCount > 1 ? `${storeCount} stores` : 'Create a second store'}
              />
              <MenuLink
                href="/privacy"
                onNavigate={() => setOpen(false)}
                icon={<ShieldCheck size={18} color="#7B8CA1" strokeWidth={1.75} />}
                label="Privacy policy"
              />
            </nav>

            <div className="px-5 pt-3">
              <button
                onClick={signOut}
                disabled={signingOut}
                className="w-full rounded-2xl p-3.5 text-sm font-semibold text-danger inline-flex items-center justify-center gap-2"
                style={{ background: '#2D1518', border: '1px solid #4D1F23', opacity: signingOut ? 0.6 : 1 }}
              >
                <LogOut size={16} />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MenuLink({
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
      onClick={onNavigate}
      className="flex items-center gap-3 px-5 py-3.5 active:bg-white/[0.03]"
      style={{ borderTop: '1px solid var(--card-border)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{label}</p>
        {hint && <p className="text-muted text-[11px] mt-0.5">{hint}</p>}
      </div>
      <ChevronRight size={16} color="#7B8CA1" />
    </Link>
  )
}
