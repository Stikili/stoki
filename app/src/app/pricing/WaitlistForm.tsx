'use client'

import { useState } from 'react'
import type { WaitlistPlan } from '@/domain/entities/waitlist-signup'

/**
 * Inline waitlist capture form for paid tiers on /pricing.
 *
 * Shipped while Ozow billing is stashed — visitors leave an email
 * against the plan they'd take. When the paid tier goes live, we
 * email everyone on the list.
 *
 * States (single component, no external state):
 *   idle       → email input + submit button
 *   submitting → button shows "Adding you…"
 *   success    → replaces form with "You're on the list ✓"
 *   already    → same as success but says "You were already on the list"
 *   error      → keeps form + shows red error line
 */
export default function WaitlistForm({ plan, planLabel }: {
  plan: WaitlistPlan
  planLabel: string
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'already' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || state === 'submitting') return

    setState('submitting')
    setError(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), plan }),
      })
      const data = await res.json() as { ok?: boolean; alreadyOnList?: boolean; error?: string }
      if (res.ok && data.ok) {
        setState(data.alreadyOnList ? 'already' : 'success')
        return
      }
      setError(data.error ?? 'Something went wrong. Try again.')
      setState('error')
    } catch {
      setError('Network error. Check your connection and try again.')
      setState('error')
    }
  }

  if (state === 'success' || state === 'already') {
    return (
      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          background: 'rgba(0, 200, 150, 0.10)',
          border: '1px solid rgba(0, 200, 150, 0.35)',
          color: 'var(--foreground)',
        }}
      >
        <p className="font-semibold" style={{ color: '#00C896' }}>
          ✓ {state === 'already' ? 'You were already on the list' : "You're on the list"}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          We&apos;ll email <span style={{ color: 'var(--foreground)' }}>{email}</span> the moment {planLabel} is available.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 min-w-0 w-full">
      {/* Stacked-only layout inside the tier card. The card grid is
          narrow enough at lg (4 cols ~280px each) that side-by-side
          input+button pushes past the column width and horizontally
          overflows the page. Vertical stack fits every viewport. */}
      <div className="flex flex-col gap-2 min-w-0 w-full">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.co.za"
          required
          autoComplete="email"
          disabled={state === 'submitting'}
          className="rounded-xl px-4 py-2.5 text-sm min-w-0 w-full"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--card-border)',
            color: 'var(--foreground)',
            outline: 'none',
          }}
          aria-label={`Email for the ${planLabel} waitlist`}
        />
        <button
          type="submit"
          disabled={!email.trim() || state === 'submitting'}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold whitespace-nowrap w-full"
          style={{
            background: '#00C896',
            color: '#0A0E17',
            opacity: !email.trim() || state === 'submitting' ? 0.5 : 1,
          }}
        >
          {state === 'submitting' ? 'Adding you…' : 'Join waitlist'}
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
      )}
      <p className="text-[11px]" style={{ color: 'var(--muted-dim)' }}>
        We&apos;ll only email you when {planLabel} goes live. No newsletter, no marketing.
      </p>
    </form>
  )
}
