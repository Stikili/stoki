import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import type { Store } from '@/domain/entities/store'
import { trialDaysRemaining, isTrialActive, TRIAL_DAYS } from '@/lib/effective-plan'

/**
 * Trial-countdown banner shown on the dashboard.
 *
 * Sits quiet for most of the trial (TRIAL_DAYS) and only surfaces in the final
 * week (day 83+) — the goal is conversion at the moment of highest intent,
 * not nagging from day one. Two urgency levels:
 *
 *   - 7 days ≥ left > 3 days   → soft-warn amber card (gentle nudge)
 *   - ≤ 3 days                 → urgent emerald card (act now)
 *
 * Server component (no interactivity needed); intentionally NOT dismissable
 * — a dismiss button would defeat conversion. The user can act or wait it
 * out.
 */
export default function TrialBanner({ store }: { store: Store }) {
  if (!isTrialActive(store)) return null
  const days = trialDaysRemaining(store)
  // Warn window: last 7 days of the trial (TRIAL_DAYS). Anything earlier is
  // silent — we don't nag users who are just settling in.
  if (days > 7) return null

  const urgent = days <= 3
  const dayWord = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
  const endDate = new Date(store.grandfatheredUntil!)
  const endLabel = endDate.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' })

  const accent = urgent ? '#00C896' : '#F59E0B'
  const accentGlow = urgent ? 'rgba(0, 200, 150,' : 'rgba(245, 158, 11,'

  return (
    <Link
      href="/settings/billing"
      className="card flex items-center gap-3 p-4 active:scale-[0.99] transition-transform"
      style={{
        background: `linear-gradient(180deg, ${accentGlow} 0.10), ${accentGlow} 0.04))`,
        border: `1px solid ${accentGlow} 0.30)`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent, color: '#03261a' }}
      >
        <Sparkles size={18} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
          Your free Business trial ends {dayWord} ({endLabel})
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          {urgent
            ? 'After this you move to Free — keep invoicing, payroll, and multi-store by picking a plan.'
            : `You've had ${TRIAL_DAYS - days} of ${TRIAL_DAYS} days — pick a plan to keep the paid features running.`}
        </p>
      </div>
      <ArrowRight size={16} strokeWidth={2} style={{ color: accent }} />
    </Link>
  )
}
