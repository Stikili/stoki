import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import type { Store } from '@/domain/entities/store'
import { grandfatherDaysRemaining, isGrandfatherActive } from '@/lib/effective-plan'

/**
 * Trial-countdown banner. Surfaced on the dashboard during the
 * grandfather window — either the 14-day Pro trial for new users or the
 * 90-day rollout grandfather for existing accounts.
 *
 * Display logic:
 *   - Inactive grandfather → render nothing.
 *   - > 3 days left → render nothing (we don't want to nag from day one).
 *   - ≤ 3 days left → urgent emerald-tinted card with a CTA to /settings/billing.
 *
 * Server component (no interactivity needed); intentionally NOT dismissable
 * — the goal is conversion at the moment of highest intent, and a dismiss
 * button would defeat that. The user can act, or wait it out.
 */
export default function TrialBanner({ store }: { store: Store }) {
  if (!isGrandfatherActive(store)) return null
  const days = grandfatherDaysRemaining(store)
  if (days > 3) return null

  const dayWord = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
  const endDate = new Date(store.grandfatheredUntil!)
  const endLabel = endDate.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <Link
      href="/settings/billing"
      className="card flex items-center gap-3 p-4 active:scale-[0.99] transition-transform"
      style={{
        background: 'linear-gradient(180deg, rgba(0, 200, 150, 0.10), rgba(0, 200, 150, 0.04))',
        border: '1px solid rgba(0, 200, 150, 0.30)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: '#00C896', color: '#03261a' }}
      >
        <Sparkles size={18} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
          Your free Pro access ends {dayWord} ({endLabel})
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Keep invoicing, multi-user, and premium advisor insights — pick a plan.
        </p>
      </div>
      <ArrowRight size={16} strokeWidth={2} style={{ color: '#00C896' }} />
    </Link>
  )
}
