'use client'

import { useState, useTransition } from 'react'
import { cancelSubscriptionAction } from '@/app/(app)/settings/actions'
import { recordAnalyticsEventAction } from '@/app/actions/analytics'
import type { Plan } from '@/domain/entities/store'

/**
 * Client-side controls for the billing-state card: a destructive "Cancel
 * subscription" button with a confirm step. The server action mutates
 * via the subscription state machine — `plan` stays at the paid tier
 * until `subscription_active_until` so the user keeps what they paid for.
 *
 * Why client-only: needs useTransition + confirm() + local feedback. Kept
 * small so the parent server component stays simple.
 */
export default function BillingActions() {
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    if (!confirm("Cancel your subscription? You'll keep your current plan until the end of the paid period.")) return
    startTransition(async () => {
      const result = await cancelSubscriptionAction()
      if (result.ok) {
        setFeedback({ kind: 'ok', msg: 'Subscription cancelled. You\'ll keep your plan until the period ends.' })
      } else {
        setFeedback({ kind: 'err', msg: result.error ?? 'Could not cancel.' })
      }
      setTimeout(() => setFeedback(null), 5_000)
    })
  }

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="w-full rounded-xl py-2.5 text-sm font-semibold"
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.20)',
          color: '#ef4444',
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {isPending ? 'Cancelling…' : 'Cancel subscription'}
      </button>
      {feedback && (
        <div
          className="rounded-xl px-3 py-2 text-xs font-semibold mt-2"
          style={feedback.kind === 'ok'
            ? { background: 'rgba(0, 200, 150, 0.10)', color: '#00C896', border: '1px solid rgba(0, 200, 150, 0.30)' }
            : { background: 'rgba(239, 68, 68, 0.10)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.30)' }}
        >
          {feedback.msg}
        </div>
      )}
    </div>
  )
}

/**
 * Wraps the per-plan "Request access" CTA so it fires `checkout_started`
 * before navigating to the mailto. Server renders the mailto URL; this
 * client wrapper just owns the onClick. Once a real payment provider
 * lands, swap `href` for the checkout-initiate URL.
 */
export function CheckoutButton({
  plan, label, mailto, className,
}: {
  plan: Plan
  label: string
  mailto: string
  className?: string
}) {
  function handleClick() {
    // Fire-and-forget — never block the navigation.
    void recordAnalyticsEventAction('checkout_started', { plan, surface: 'billing_page' })
  }
  return (
    <a href={mailto} onClick={handleClick} className={className ?? 'btn-primary inline-flex items-center justify-center w-full active:scale-[0.985]'}>
      {label}
    </a>
  )
}
