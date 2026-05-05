'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Package, Users, FileText, Truck, CreditCard,
  Plus, Receipt, BarChart3, Settings as SettingsIcon, Wallet,
  ArrowRight,
} from 'lucide-react'
import { globalSearchAction, type GlobalSearchResult } from '@/app/actions/globalSearch'
import { haptic } from '@/lib/haptic'

/**
 * Cmd+K / Ctrl+K command palette. Mounted globally inside `(app)/layout.tsx`.
 *
 * Empty state shows quick-actions; typing triggers a debounced cross-entity
 * search (products, customers, debtors, suppliers, invoices). ↑/↓ navigates,
 * Enter selects, Esc closes.
 *
 * Mobile: tapping the search-bar element in the bottom nav (or any other
 * trigger) dispatches a `'stoki:open-palette'` window event.
 */
export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [active, setActive] = useState(0)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Open via Cmd+K / Ctrl+K AND via custom event (so a tap-trigger can open it
  // on touch devices that have no shortcut key).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    const opener = () => setOpen(true)
    window.addEventListener('keydown', handler)
    window.addEventListener('stoki:open-palette', opener)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('stoki:open-palette', opener)
    }
  }, [open])

  // Reset state when (re)opened so each invocation feels fresh, and focus the
  // input on the next frame (paint must finish first or the autofocus is lost).
  // setStates are wrapped in rAF to avoid the set-state-in-effect cascading-
  // render lint rule — we want this work on the next frame anyway.
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      setQuery('')
      setResults([])
      setActive(0)
      inputRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  // Debounced server search. 180ms balances responsiveness vs. burst-rate; we
  // also cancel via a stale-flag captured per call so a slow earlier fetch
  // can't overwrite a fresh later one. The empty-query branch doesn't need a
  // setResults — `visible` derives from `query` directly so stale results are
  // already hidden when the user clears the input.
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length === 0) return
    let stale = false
    const timer = setTimeout(() => {
      startTransition(async () => {
        const out = await globalSearchAction(q)
        if (!stale) { setResults(out); setActive(0) }
      })
    }, 180)
    return () => { stale = true; clearTimeout(timer) }
  }, [query, open])

  const visible: PaletteItem[] = query.trim()
    ? results.map(searchToItem)
    : QUICK_ACTIONS

  function pick(item: PaletteItem) {
    haptic(20)
    setOpen(false)
    if (item.event) {
      window.dispatchEvent(new CustomEvent(item.event))
      return
    }
    if (item.href) router.push(item.href)
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(i + 1, visible.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = visible[active]
      if (item) pick(item)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh] sm:pt-24 animate-toast-in"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} />

      <div
        className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <Search size={18} color="#9DB0C5" strokeWidth={1.8} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search products, customers, invoices…"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--foreground)' }}
            autoComplete="off"
          />
          <button
            onClick={() => setOpen(false)}
            className="text-muted text-xs px-2 py-1 rounded-md min-h-0"
            style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
          >
            Esc
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {!query.trim() && (
            <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted">Quick actions</p>
          )}
          {visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-muted text-sm">No matches for &ldquo;{query}&rdquo;</p>
          ) : (
            visible.map((item, i) => (
              <button
                key={item.id}
                onClick={() => pick(item)}
                onMouseEnter={() => setActive(i)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 min-h-0"
                style={{
                  background: i === active ? 'var(--surface)' : 'transparent',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: KIND_TINT[item.kind].bg, color: KIND_TINT[item.kind].fg }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {item.label}
                  </p>
                  {item.subLabel && (
                    <p className="text-xs text-muted truncate">{item.subLabel}</p>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted">{KIND_LABEL[item.kind]}</span>
                {i === active && <ArrowRight size={14} className="text-muted" />}
              </button>
            ))
          )}
        </div>

        <div
          className="px-4 py-2 flex items-center justify-between text-[11px] text-muted"
          style={{ borderTop: '1px solid var(--card-border)' }}
        >
          <span>↑↓ navigate · ↵ select</span>
          <span className="hidden sm:inline">⌘K to toggle</span>
        </div>
      </div>
    </div>
  )
}

// ── items ─────────────────────────────────────────────────────────────────

interface PaletteItem {
  id: string
  kind: 'product' | 'customer' | 'invoice' | 'supplier' | 'debtor' | 'action'
  label: string
  subLabel?: string
  href?: string
  event?: string
  icon: React.ReactNode
}

const KIND_LABEL: Record<PaletteItem['kind'], string> = {
  product: 'Product',
  customer: 'Customer',
  invoice: 'Invoice',
  supplier: 'Supplier',
  debtor: 'Debtor',
  action: 'Action',
}

const KIND_TINT: Record<PaletteItem['kind'], { bg: string; fg: string }> = {
  product:  { bg: 'rgba(0,200,150,0.12)',  fg: '#00C896' },
  customer: { bg: 'rgba(96,165,250,0.12)', fg: '#7AB7FB' },
  invoice:  { bg: 'rgba(192,132,252,0.12)', fg: '#C084FC' },
  supplier: { bg: 'rgba(245,158,11,0.12)', fg: '#F59E0B' },
  debtor:   { bg: 'rgba(251,146,60,0.12)', fg: '#FB923C' },
  action:   { bg: 'rgba(123,140,161,0.12)', fg: '#9DB0C5' },
}

const ICON_FOR_KIND: Record<Exclude<PaletteItem['kind'], 'action'>, React.ReactNode> = {
  product:  <Package size={16} strokeWidth={1.8} />,
  customer: <Users size={16} strokeWidth={1.8} />,
  invoice:  <FileText size={16} strokeWidth={1.8} />,
  supplier: <Truck size={16} strokeWidth={1.8} />,
  debtor:   <CreditCard size={16} strokeWidth={1.8} />,
}

function searchToItem(r: GlobalSearchResult): PaletteItem {
  return {
    id: `${r.kind}:${r.id}`,
    kind: r.kind,
    label: r.label,
    subLabel: r.subLabel,
    href: r.href,
    icon: ICON_FOR_KIND[r.kind],
  }
}

const QUICK_ACTIONS: PaletteItem[] = [
  { id: 'qa:sale',     kind: 'action', label: 'New sale',     subLabel: 'Add items to cart, take payment', href: '/sales',     icon: <Plus size={16} strokeWidth={2} /> },
  { id: 'qa:invoice',  kind: 'action', label: 'New invoice',  subLabel: 'Issue an invoice to a B2B customer', href: '/invoices?new=1', icon: <FileText size={16} strokeWidth={1.8} /> },
  { id: 'qa:cashup',   kind: 'action', label: 'Cash up',      subLabel: 'Close today and reconcile takings', href: '/cashup',   icon: <Wallet size={16} strokeWidth={1.8} /> },
  { id: 'qa:reports',  kind: 'action', label: 'Reports',      subLabel: 'P&L · Sales · VAT',                href: '/reports',  icon: <BarChart3 size={16} strokeWidth={1.8} /> },
  { id: 'qa:credit',   kind: 'action', label: 'Credit book',  subLabel: 'Record what someone owes you',     href: '/credit',   icon: <CreditCard size={16} strokeWidth={1.8} /> },
  { id: 'qa:inventory',kind: 'action', label: 'Inventory',    subLabel: 'Products, stock levels, restocks', href: '/inventory',icon: <Package size={16} strokeWidth={1.8} /> },
  { id: 'qa:receipts', kind: 'action', label: 'Recent sales', subLabel: 'View today and history',           href: '/sales?tab=history', icon: <Receipt size={16} strokeWidth={1.8} /> },
  { id: 'qa:settings', kind: 'action', label: 'Settings',     subLabel: 'Store, team, VAT, account',        href: '/settings', icon: <SettingsIcon size={16} strokeWidth={1.8} /> },
]

