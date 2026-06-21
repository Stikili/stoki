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
} from 'lucide-react'
import { haptic } from '@/lib/haptic'
import IconBadge, { type IconTone } from '@/components/IconBadge'
import type { StoreRole } from '@/domain/entities/store-user'

// Tile catalogue. Each tile has:
//   - icon  : lucide glyph (selected for elegance + low ambiguity at a glance)
//   - tone  : IconBadge category colour, so the grid reads as a curated set
//             rather than a wall of monotone gray
//   - hint  : long-press copy (450ms hold reveals)
//   - roles : visibility filter — cashiers only see what they can act on
const ALL_TILES = [
  { href: '/cashup',     label: 'Cash up',    Icon: Coins,         tone: 'brand'  as IconTone, hint: 'End-of-day cash count, by payment method.',                                  roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/reports',    label: 'Reports',    Icon: LineChart,     tone: 'blue'   as IconTone, hint: 'P&L, sales detail, VAT — exportable as PDF or CSV.',                          roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/invoices',   label: 'Invoices',   Icon: ReceiptText,   tone: 'blue'   as IconTone, hint: 'B2B invoices with VAT and payment tracking.',                                 roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/customers',  label: 'Customers',  Icon: UsersRound,    tone: 'violet' as IconTone, hint: 'B2B customer book — payment terms, addresses, VAT numbers.',                  roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/expenses',   label: 'Expenses',   Icon: FileText,      tone: 'amber'  as IconTone, hint: 'Record business expenses (rent, transport, airtime).',                        roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/suppliers',  label: 'Suppliers',  Icon: Truck,         tone: 'cyan'   as IconTone, hint: 'Suppliers and 90-day purchasing history.',                                    roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/payables',   label: 'Payables',   Icon: CreditCard,    tone: 'amber'  as IconTone, hint: 'Bills you owe suppliers — aging buckets and payment tracking.',              roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/cashflow',   label: 'Cash flow',  Icon: Activity,      tone: 'brand'  as IconTone, hint: '30-day projection from invoices, supplier bills, recurring rules and trading averages.', roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/assets',     label: 'Assets',     Icon: Archive,       tone: 'cyan'   as IconTone, hint: 'Fixed-asset register — fridges, vehicles, equipment. Monthly depreciation flows into P&L.', roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/purchase-orders', label: 'POs',   Icon: PackageCheck,  tone: 'blue'   as IconTone, hint: 'Purchase orders — what you\'ve ordered, what\'s arrived, what\'s overdue.', roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/payroll',    label: 'Payroll',    Icon: Users2,        tone: 'violet' as IconTone, hint: 'Monthly PAYE / UIF / SDL calculation with EMP201 export.', roles: ['owner'] as StoreRole[] },
  { href: '/stocktake',  label: 'Stocktake',  Icon: ClipboardList, tone: 'cyan'   as IconTone, hint: 'Count physical stock vs system, audit shrinkage.',                            roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/reconcile',  label: 'Reconcile',  Icon: Landmark,      tone: 'blue'   as IconTone, hint: 'Match a bank-statement CSV to invoices and expenses.',                        roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/airtime',    label: 'Airtime',    Icon: Signal,        tone: 'violet' as IconTone, hint: 'Load pre-bought voucher PINs — sales auto-dispense.',                         roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/broadcasts', label: 'Broadcasts', Icon: Megaphone,     tone: 'rose'   as IconTone, hint: 'Send Meta-template WhatsApp messages to opted-in customers.',                 roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/pricelist',  label: 'Prices',     Icon: Tag,           tone: 'brand'  as IconTone, hint: 'Quick price lookup with photos — cashier-friendly.',                          roles: ['owner', 'manager', 'cashier'] as StoreRole[] },
] as const

const LONG_PRESS_MS = 450

export default function DashboardTiles({
  role,
  showPayroll = true,
  showInvoices = true,
}: {
  role: StoreRole
  /** Hide /payroll tile when the owner isn't on PAYE yet (no employees and
   *  not VAT-registered). Default true preserves current behaviour for
   *  callers that haven't opted in. */
  showPayroll?: boolean
  /** Hide B2B /invoices + /customers when the owner is purely cash-and-carry
   *  (not VAT-registered). Default true preserves current behaviour. */
  showInvoices?: boolean
}) {
  const [hintFor, setHintFor] = useState<string | null>(null)
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

  const tiles = ALL_TILES
    .filter((t) => t.roles.includes(role))
    .filter((t) => showPayroll || t.href !== '/payroll')
    .filter((t) => showInvoices || (t.href !== '/invoices' && t.href !== '/customers'))
  const active = hintFor ? tiles.find((t) => t.href === hintFor) : null

  return (
    <>
      <div>
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 ml-1">Manage</p>
        <div className="grid grid-cols-4 gap-2">
          {tiles.map(({ href, label, Icon, tone }) => (
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
              <IconBadge icon={<Icon />} tone={tone} size="md" />
              <span className="text-[10px] font-semibold mt-2" style={{ color: 'var(--muted)' }}>{label}</span>
            </Link>
          ))}
        </div>
        <p className="text-muted text-[10px] mt-2 ml-1">Tip: hold a tile for a short description.</p>
      </div>

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
