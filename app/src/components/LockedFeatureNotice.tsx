import Link from 'next/link'
import { Lock, ArrowRight } from 'lucide-react'
import { GATES, type GateId } from '@/lib/plan-gates'

/**
 * Full-page paywall shown when a user navigates to a feature their plan
 * doesn't include. Distinct from <UpgradePrompt /> (the mid-flow modal) —
 * this one is the destination, used as the entire page body.
 *
 * Pure server component — no analytics from here (analytics on the
 * destination /settings/billing page handles conversion attribution).
 */
export default function LockedFeatureNotice({ gate }: { gate: GateId }) {
  const meta = GATES[gate]
  const planLabel = meta.minPlan === 'pro' ? 'Pro'
    : meta.minPlan === 'business' ? 'Business'
    : 'Enterprise'

  return (
    <div className="px-5 pt-10 pb-6 max-w-md mx-auto">
      <Link href="/dashboard" className="text-muted text-xs inline-flex items-center gap-1 mb-6">
        ← Back to dashboard
      </Link>

      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'rgba(0, 200, 150, 0.12)',
          color: '#00C896',
          border: '1px solid rgba(0, 200, 150, 0.30)',
        }}
      >
        <Lock size={20} strokeWidth={1.8} />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-1.5" style={{ color: 'var(--muted-dim)' }}>
        {planLabel} feature
      </p>
      <h1 className="text-2xl font-bold tracking-tight mb-3" style={{ color: 'var(--foreground)' }}>
        {meta.label}
      </h1>
      <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted)' }}>
        {meta.description}
      </p>

      <Link
        href="/settings/billing"
        className="btn-primary inline-flex items-center justify-center gap-2 w-full"
      >
        See {planLabel} <ArrowRight size={16} strokeWidth={2.4} />
      </Link>

      <p className="text-muted text-[11px] text-center mt-4">
        You can still use everything on your current plan from the dashboard.
      </p>
    </div>
  )
}
