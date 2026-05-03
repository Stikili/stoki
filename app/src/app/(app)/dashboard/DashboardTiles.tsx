'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Wallet,
  Calculator,
  Users,
  BarChart3,
  Truck,
  Receipt,
  Tags,
  ClipboardCheck,
  Banknote,
  Smartphone,
  Megaphone,
} from 'lucide-react'
import { haptic } from '@/lib/haptic'
import type { StoreRole } from '@/domain/entities/store-user'

// Tile catalogue. `hint` is shown on long-press so users learn the surface
// without trial-and-error tapping. Roles control visibility — the dashboard
// will never render a tile the role isn't permitted to use.
const ALL_TILES = [
  { href: '/cashup',     label: 'Cash up',   Icon: Calculator,     hint: 'End-of-day cash count, by payment method.',                                  roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/reports',    label: 'Reports',   Icon: BarChart3,      hint: 'P&L, sales detail, VAT — exportable as PDF or CSV.',                          roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/invoices',   label: 'Invoices',  Icon: Receipt,        hint: 'B2B invoices with VAT and payment tracking.',                                 roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/customers',  label: 'Customers', Icon: Users,          hint: 'B2B customer book — payment terms, addresses, VAT numbers.',                  roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/expenses',   label: 'Expenses',  Icon: Wallet,         hint: 'Record business expenses (rent, transport, airtime).',                        roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/suppliers',  label: 'Suppliers', Icon: Truck,          hint: 'Suppliers and 90-day purchasing history.',                                    roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/stocktake',  label: 'Stocktake', Icon: ClipboardCheck, hint: 'Count physical stock vs system, audit shrinkage.',                            roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/reconcile',  label: 'Reconcile', Icon: Banknote,       hint: 'Match a bank-statement CSV to invoices and expenses.',                        roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/airtime',    label: 'Airtime',   Icon: Smartphone,     hint: 'Load pre-bought voucher PINs — sales auto-dispense.',                         roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/broadcasts', label: 'Broadcasts',Icon: Megaphone,      hint: 'Send Meta-template WhatsApp messages to opted-in customers.',                 roles: ['owner', 'manager'] as StoreRole[] },
  { href: '/pricelist',  label: 'Prices',    Icon: Tags,           hint: 'Quick price lookup with photos — cashier-friendly.',                          roles: ['owner', 'manager', 'cashier'] as StoreRole[] },
] as const

const LONG_PRESS_MS = 450

export default function DashboardTiles({ role }: { role: StoreRole }) {
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

  const tiles = ALL_TILES.filter((t) => t.roles.includes(role))
  const active = hintFor ? tiles.find((t) => t.href === hintFor) : null

  return (
    <>
      <div>
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 ml-1">Manage</p>
        <div className="grid grid-cols-4 gap-2">
          {tiles.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              onPointerDown={() => startHold(href)}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onPointerCancel={endHold}
              onContextMenu={(e) => e.preventDefault()}
              className="card flex flex-col items-center justify-center py-3 px-2 active:scale-[0.97] transition-transform select-none"
            >
              <Icon size={20} color="#7B8CA1" strokeWidth={1.75} />
              <span className="text-[10px] font-semibold mt-1.5" style={{ color: 'var(--muted)' }}>{label}</span>
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
