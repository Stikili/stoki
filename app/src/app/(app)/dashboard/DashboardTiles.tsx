'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Coins,
  LineChart,
  FileText,
  UsersRound,
  ReceiptText,
  Truck,
  ClipboardList,
  Landmark,
  Signal,
  Megaphone,
  Tag,
  CreditCard,
  Activity,
  Archive,
  PackageCheck,
  Users2,
  Lock,
  ChevronDown,
} from 'lucide-react'
import { haptic } from '@/lib/haptic'
import IconBadge, { type IconTone } from '@/components/IconBadge'
import UpgradePrompt from '@/components/UpgradePrompt'
import type { StoreRole } from '@/domain/entities/store-user'
import type { GateId } from '@/lib/plan-gates'

// Tile catalogue. Each tile has:
//   - icon  : lucide glyph (selected for elegance + low ambiguity at a glance)
//   - tone  : IconBadge category colour, so the grid reads as a curated set
//             rather than a wall of monotone gray
//   - hint  : long-press copy (450ms hold reveals)
//   - roles : visibility filter — cashiers only see what they can act on
//   - group : 'daily' (used most days running the till) vs 'books' (used
//             for month-end, accounting, formal procurement). Drives the
//             Manage section's two-bucket layout. In simple view, the
//             Books bucket is collapsed behind a click-to-expand so the
//             spaza audience isn't confronted with a wall of accounting
//             icons they don't need.
type TileGroup = 'daily' | 'books'
const ALL_TILES = [
  { href: '/cashup',     label: 'Cash up',    Icon: Coins,         tone: 'brand'  as IconTone, group: 'daily' as TileGroup, hint: 'End-of-day cash count, by payment method.',                                  roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/expenses',   label: 'Expenses',   Icon: FileText,      tone: 'amber'  as IconTone, group: 'daily' as TileGroup, hint: 'Record business expenses (rent, transport, airtime).',                        roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/suppliers',  label: 'Suppliers',  Icon: Truck,         tone: 'cyan'   as IconTone, group: 'daily' as TileGroup, hint: 'Suppliers and 90-day purchasing history.',                                    roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/stocktake',  label: 'Stocktake',  Icon: ClipboardList, tone: 'cyan'   as IconTone, group: 'daily' as TileGroup, hint: 'Count physical stock vs system, audit shrinkage.',                            roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/airtime',    label: 'Airtime',    Icon: Signal,        tone: 'violet' as IconTone, group: 'daily' as TileGroup, hint: 'Load pre-bought voucher PINs — sales auto-dispense.',                         roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/pricelist',  label: 'Prices',     Icon: Tag,           tone: 'brand'  as IconTone, group: 'daily' as TileGroup, hint: 'Quick price lookup with photos — cashier-friendly.',                          roles: ['owner', 'manager', 'cashier'] as StoreRole[] },
  { href: '/reports',    label: 'Reports',    Icon: LineChart,     tone: 'blue'   as IconTone, group: 'books' as TileGroup, hint: 'P&L, sales detail, VAT — exportable as PDF or CSV.',                          roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/invoices',   label: 'Invoices',   Icon: ReceiptText,   tone: 'blue'   as IconTone, group: 'books' as TileGroup, hint: 'B2B invoices with VAT and payment tracking.',                                 roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/customers',  label: 'Customers',  Icon: UsersRound,    tone: 'violet' as IconTone, group: 'books' as TileGroup, hint: 'B2B customer book — payment terms, addresses, VAT numbers.',                  roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/payables',   label: 'Payables',   Icon: CreditCard,    tone: 'amber'  as IconTone, group: 'books' as TileGroup, hint: 'Bills you owe suppliers — aging buckets and payment tracking.',              roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/cashflow',   label: 'Cash flow',  Icon: Activity,      tone: 'brand'  as IconTone, group: 'books' as TileGroup, hint: '30-day projection from invoices, supplier bills, recurring rules and trading averages.', roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/assets',     label: 'Assets',     Icon: Archive,       tone: 'cyan'   as IconTone, group: 'books' as TileGroup, hint: 'Fixed-asset register — fridges, vehicles, equipment. Monthly depreciation flows into P&L.', roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/purchase-orders', label: 'POs',   Icon: PackageCheck,  tone: 'blue'   as IconTone, group: 'books' as TileGroup, hint: 'Purchase orders — what you\'ve ordered, what\'s arrived, what\'s overdue.', roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/payroll',    label: 'Payroll',    Icon: Users2,        tone: 'violet' as IconTone, group: 'books' as TileGroup, hint: 'Monthly PAYE / UIF / SDL calculation with EMP201 export.', roles: ['owner'] as StoreRole[] },
  { href: '/reconcile',  label: 'Reconcile',  Icon: Landmark,      tone: 'blue'   as IconTone, group: 'books' as TileGroup, hint: 'Match a bank-statement CSV to invoices and expenses.',                        roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/broadcasts', label: 'Broadcasts', Icon: Megaphone,     tone: 'rose'   as IconTone, group: 'books' as TileGroup, hint: 'Send Meta-template WhatsApp messages to opted-in customers.',                 roles: ['owner', 'manager'] as StoreRole[] },
] as const

const LONG_PRESS_MS = 450

/** Tile href → plan-gate id. Tiles in this map render with a lock badge
 *  for users whose plan doesn't include the feature; clicking opens the
 *  upgrade prompt instead of navigating. Tiles NOT in this map are open
 *  to every plan. */
const HREF_TO_GATE: Partial<Record<string, GateId>> = {
  '/invoices':        'invoice.create',
  '/customers':       'invoice.create',
  '/reconcile':       'reports.bank_reconcile',
  '/broadcasts':      'broadcast.send',
  '/payroll':         'payroll.run',
  '/assets':          'assets.manage',
  '/payables':        'payables.manage',
  '/purchase-orders': 'purchase_orders.create',
}

type Tile = (typeof ALL_TILES)[number]

export default function DashboardTiles({
  role,
  showPayroll = true,
  showInvoices = true,
  lockedGates = [],
  simpleView = false,
}: {
  role: StoreRole
  /** Hide /payroll tile when the owner isn't on PAYE yet (no employees and
   *  not VAT-registered). Default true preserves current behaviour for
   *  callers that haven't opted in. */
  showPayroll?: boolean
  /** Hide B2B /invoices + /customers when the owner is purely cash-and-carry
   *  (not VAT-registered). Default true preserves current behaviour. */
  showInvoices?: boolean
  /** Gates the user's plan doesn't include. Locked tiles still appear in
   *  the grid (with a lock badge) so they drive upsell; clicking opens
   *  the upgrade prompt instead of navigating. */
  lockedGates?: GateId[]
  /** Information-density preference. When true, the "Books" tile group
   *  starts collapsed behind a click-to-expand. The Daily section is
   *  always shown. Default false preserves "show everything" behaviour
   *  for callers that haven't opted in. */
  simpleView?: boolean
}) {
  const [hintFor, setHintFor] = useState<string | null>(null)
  const [upgradeGate, setUpgradeGate] = useState<GateId | null>(null)
  // Books section disclosure — starts collapsed only when simpleView is on.
  // Once the user expands within a session we don't auto-collapse on re-render;
  // mirrors the iOS Settings disclosure idiom and avoids a "where did it go?"
  // moment after a soft refresh inside the session.
  const [booksOpen, setBooksOpen] = useState<boolean>(!simpleView)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function startHold(href: string) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      haptic(20)
      setHintFor(href)
    }, LONG_PRESS_MS)
  }
  function endHold() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }

  const lockedSet = new Set(lockedGates)
  const visibleTiles: readonly Tile[] = ALL_TILES
    .filter((t) => t.roles.includes(role))
    .filter((t) => showPayroll || t.href !== '/payroll')
    .filter((t) => showInvoices || (t.href !== '/invoices' && t.href !== '/customers'))
  const dailyTiles = visibleTiles.filter((t) => t.group === 'daily')
  const booksTiles = visibleTiles.filter((t) => t.group === 'books')
  const active = hintFor ? visibleTiles.find((t) => t.href === hintFor) : null

  function renderTile({ href, label, Icon, tone }: Tile) {
    const gate = HREF_TO_GATE[href]
    const locked = gate ? lockedSet.has(gate) : false

    const inner = (
      <>
        <div className="relative">
          <IconBadge icon={<Icon />} tone={tone} size="md" />
          {locked && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full inline-flex items-center justify-center"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: '#7B8CA1',
              }}
              aria-label="Pro feature"
            >
              <Lock size={9} strokeWidth={2.2} />
            </span>
          )}
        </div>
        <span
          className="text-[10px] font-semibold mt-2"
          style={{ color: locked ? 'var(--muted-dim)' : 'var(--muted)' }}
        >
          {label}
        </span>
      </>
    )

    if (locked && gate) {
      return (
        <button
          key={href}
          type="button"
          onClick={() => { haptic(20); setUpgradeGate(gate) }}
          onPointerDown={() => startHold(href)}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onContextMenu={(e) => e.preventDefault()}
          className="card tile-press flex flex-col items-center justify-center py-3.5 px-2 select-none w-full"
          style={{ opacity: 0.85 }}
        >
          {inner}
        </button>
      )
    }

    return (
      <Link
        key={href}
        href={href}
        onPointerDown={() => startHold(href)}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        className="card tile-press flex flex-col items-center justify-center py-3.5 px-2 select-none"
      >
        {inner}
      </Link>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Daily — operational tools used most days (cashup, stocktake, prices). */}
        {dailyTiles.length > 0 && (
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 ml-1">Daily</p>
            <div className="grid grid-cols-4 gap-2">{dailyTiles.map(renderTile)}</div>
          </div>
        )}

        {/* Books — month-end / accounting / formal procurement. Hidden behind
            a click-to-expand when simpleView is on. */}
        {booksTiles.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => { haptic(15); setBooksOpen((v) => !v) }}
              className="w-full flex items-center justify-between ml-1 mb-2 -mr-1 py-1"
              aria-expanded={booksOpen}
            >
              <p className="text-muted text-xs font-semibold uppercase tracking-widest">Books</p>
              <span className="inline-flex items-center gap-1 text-muted text-[11px]">
                {booksOpen ? 'Hide' : `Show ${booksTiles.length}`}
                <ChevronDown
                  size={12}
                  strokeWidth={2}
                  style={{
                    transform: booksOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                  }}
                />
              </span>
            </button>
            {booksOpen && (
              <div className="grid grid-cols-4 gap-2">{booksTiles.map(renderTile)}</div>
            )}
          </div>
        )}

        <p className="text-muted text-[10px] ml-1">Tip: hold a tile for a short description.</p>
      </div>

      {upgradeGate && (
        <UpgradePrompt
          gate={upgradeGate}
          open={true}
          onClose={() => setUpgradeGate(null)}
        />
      )}

      {/* Long-press hint overlay — dismiss layer behind, card in front */}
      {active && (
        <div className="fixed inset-0 z-[80]" aria-live="polite">
          <button
            onClick={() => setHintFor(null)}
            className="absolute inset-0"
            aria-label="Dismiss hint"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          />
          <div className="relative h-full flex items-end justify-center pb-24 pointer-events-none">
            <div
              className="rounded-2xl px-5 py-4 max-w-xs mx-4 text-center pointer-events-auto"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              }}
              onClick={() => setHintFor(null)}
            >
              <div className="flex justify-center mb-2">
                <IconBadge icon={<active.Icon />} tone={active.tone} size="lg" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">{active.label}</p>
              <p className="text-sm" style={{ color: 'var(--foreground)' }}>{active.hint}</p>
              <p className="text-muted text-[10px] mt-2">Tap anywhere to dismiss</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
