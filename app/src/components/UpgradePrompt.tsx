'use client'

import Link from 'next/link'
import { ArrowRight, Lock, X } from 'lucide-react'
import { GATES, type GateId } from '@/lib/plan-gates'

/**
 * Soft-paywall sheet shown when a user hits a feature gate in the middle
 * of a flow. Surfaces what the locked feature does, what plan unlocks it,
 * and a one-tap path to /settings/billing.
 *
 * Designed to never block the in-progress flow without offering an out:
 * the sheet has a close affordance, and the user lands back where they
 * were rather than getting redirected.
 */
export default function UpgradePrompt({
  gate,
  open,
  onClose,
}: {
  gate: GateId
  open: boolean
  onClose: () => void
}) {
  if (!open) return null
  const meta = GATES[gate]
  const planLabel = meta.minPlan === 'pro' ? 'Pro' : meta.minPlan === 'business' ? 'Business' : 'Enterprise'

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-8"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center min-h-0"
          style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
        >
          <X size={16} />
        </button>

        <div className="w-12 h-1 rounded-full mx-auto mb-5 sm:hidden" style={{ background: 'var(--card-border)' }} />

        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(0, 200, 150, 0.12)', color: '#00C896', border: '1px solid rgba(0, 200, 150, 0.30)' }}
        >
          <Lock size={20} strokeWidth={1.8} />
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-1.5" style={{ color: 'var(--muted-dim)' }}>
          {planLabel} feature
        </p>
        <h2 className="text-xl font-bold tracking-tight mb-2" style={{ color: 'var(--foreground)' }}>
          {meta.label}
        </h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>
          {meta.description}
        </p>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/settings/billing"
            className="btn-primary inline-flex items-center justify-center gap-2 active:scale-[0.985] transition-transform"
          >
            See {planLabel} <ArrowRight size={16} strokeWidth={2.4} />
          </Link>
          <button
            onClick={onClose}
            className="rounded-2xl py-3 font-semibold text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
