import Link from 'next/link'
import { ArrowLeft, Check, Lock, Sparkles } from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import { effectivePlan, grandfatherDaysRemaining, isGrandfatherActive } from '@/lib/effective-plan'
import { GATES, type GateId } from '@/lib/plan-gates'
import type { Plan } from '@/domain/entities/store'
import BillingActions, { CheckoutButton } from '@/components/settings/BillingActions'

// The seven Pro-tier AI advisor features. Explicit list rather than
// computed from GATES so the page lists them in the order we want users
// to read them, not Map insertion order.
const PRO_ADVISOR_GATES: readonly GateId[] = [
  'advisor.peer_benchmarking',
  'advisor.supplier_scorecard',
  'advisor.basket_analysis',
  'advisor.local_price',
  'advisor.business_valuation',
  'advisor.funding_navigator',
  'advisor.group_buying',
] as const

/**
 * Plan picker / billing page. Upgrade buttons are stubbed until a payment
 * provider is wired in — they open a mailto: link so the user can request
 * access manually. The page is otherwise complete: it shows the user's
 * effective plan, what grandfather window they're in (if any), and the
 * three tiers with feature lists.
 */
export default async function BillingPage() {
  const { store } = await getServerData()
  const current = effectivePlan(store)
  const grandfather = isGrandfatherActive(store) ? grandfatherDaysRemaining(store) : 0
  const sub = subscriptionSummary(store.subscriptionStatus, store.subscriptionActiveUntil, store.subscriptionRetryCount)

  return (
    <div className="px-4 pt-6 pb-12 max-w-2xl mx-auto space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-muted text-sm">
        <ArrowLeft size={14} /> Settings
      </Link>
      <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Billing &amp; plan</h1>

      {/* Subscription state banner — past_due / cancelled need urgent UX,
          active gets a quiet confirmation, none/expired hide. */}
      {sub.banner && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: sub.banner.tint === 'danger' ? 'rgba(239, 68, 68, 0.08)' :
                        sub.banner.tint === 'warning' ? 'rgba(245, 158, 11, 0.08)' :
                        'rgba(0, 200, 150, 0.08)',
            border: `1px solid ${
              sub.banner.tint === 'danger' ? 'rgba(239, 68, 68, 0.30)' :
              sub.banner.tint === 'warning' ? 'rgba(245, 158, 11, 0.30)' :
              'rgba(0, 200, 150, 0.30)'}`,
          }}
        >
          <p className="font-semibold text-sm" style={{
            color: sub.banner.tint === 'danger' ? '#ef4444' :
                   sub.banner.tint === 'warning' ? '#f59e0b' : '#00C896',
          }}>{sub.banner.title}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub.banner.body}</p>
        </div>
      )}

      {/* Current plan / grandfather state */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(0, 200, 150, 0.12)', color: '#00C896', border: '1px solid rgba(0, 200, 150, 0.30)' }}>
            <Sparkles size={18} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-0.5" style={{ color: 'var(--muted-dim)' }}>
              Current plan
            </p>
            <p className="font-bold" style={{ color: 'var(--foreground)' }}>{planLabel(current)}</p>
            {grandfather > 0 ? (
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                You have <span style={{ color: '#00C896', fontWeight: 600 }}>{grandfather} day{grandfather === 1 ? '' : 's'}</span> of free Pro access remaining{store.plan === 'free' ? ' — your account stays on Free after that unless you upgrade' : ''}.
              </p>
            ) : (
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {current === 'free'
                  ? 'Upgrade to unlock invoicing, multi-user, and premium AI advisor features.'
                  : current === 'pro'
                    ? 'Pro perks active — invoicing, multi-user, unlimited advisor, bank reconcile.'
                    : 'Business plan active — multi-store, larger team, cross-store reporting.'}
              </p>
            )}
          </div>
        </div>

        {/* Cancel button — only shown when there's something to cancel. */}
        {(store.subscriptionStatus === 'active' || store.subscriptionStatus === 'past_due') && (
          <BillingActions />
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-3">
        <PlanCard
          name="Free" subtitle="for the spaza on day one" price="R0"
          current={current === 'free' && !grandfather}
          features={[
            '1 store, 1 user',
            'Unlimited products & sales',
            'Credit book + WhatsApp reminders',
            '10 AI advisor questions / day',
            'All auto-pushed alerts (margin, stockout, dead stock, fuel day…)',
            'P&L + cash-up reports',
          ]}
        />
        <PlanCard
          name="Pro" subtitle="for the trader running their own shop" price="R99 / month"
          highlight current={current === 'pro'}
          features={[
            'Everything in Free',
            '2 users (owner + cashier or manager)',
            'B2B invoicing (SARS-compliant)',
            'Unlimited AI advisor + 7 Pro insights unlocked',
            'Bank reconciliation, stocktake',
            'Accounting exports',
            'WhatsApp broadcasts (50 messages / month)',
          ]}
          cta="Request Pro access"
        />
        <PlanCard
          name="Business" subtitle="for shops growing into chains" price="R399 / month"
          current={current === 'business'}
          features={[
            'Everything in Pro',
            'Up to 3 stores',
            'Up to 10 users',
            'Cross-store reports + cohort analytics',
            'Higher WhatsApp broadcast limits (250 / month)',
            'API access',
            'Priority support',
          ]}
          cta="Request Business access"
        />
      </div>

      {/* What's locked — only shown to Free users (or grandfathered users on
          their effective plan) so it actually advertises real upgrade value.
          Pro / Business users already have these unlocked; showing the same
          list to them as "locked" would be confusing. */}
      {current === 'free' && (
        <div className="rounded-2xl p-5 mt-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Lock size={14} style={{ color: 'var(--muted)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>What you unlock on Pro</p>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Seven AI advisor insights only Pro users get. Tap each to see what it does for your shop.
          </p>
          <ul className="flex flex-col gap-3">
            {PRO_ADVISOR_GATES.map(gateId => {
              const g = GATES[gateId]
              return (
                <li key={gateId} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(0, 200, 150, 0.10)', color: '#00C896', border: '1px solid rgba(0, 200, 150, 0.25)' }}
                  >
                    <Lock size={13} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{g.label}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>{g.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="text-center text-xs mt-4" style={{ color: 'var(--muted-dim)' }}>
        Need a custom plan for multiple branches, white-label, or SSO? Email <a href="mailto:hello@stoki.app" className="underline" style={{ color: 'var(--muted)' }}>hello@stoki.app</a>.
      </p>
    </div>
  )
}

function planLabel(p: Plan): string {
  switch (p) {
    case 'free':       return 'Free'
    case 'pro':        return 'Pro'
    case 'business':   return 'Business'
    case 'enterprise': return 'Enterprise'
  }
}

/**
 * Build the user-facing summary of the billing state machine. Returns a
 * banner config (or null) describing what the user should know:
 *   - active:    quiet "renews on X" line, no urgent tint
 *   - cancelled: "you cancelled, access until X" — warning tint
 *   - past_due:  "we couldn't charge your card" — danger tint
 *   - expired:   no banner, falls through to upgrade pitch in the cards
 *   - none / trialing: no banner needed (trial countdown lives on dashboard)
 */
function subscriptionSummary(
  status: string,
  activeUntil: string | null,
  retryCount: number,
): { banner: { title: string; body: string; tint: 'success' | 'warning' | 'danger' } | null } {
  if (!activeUntil) {
    return { banner: null }
  }
  const ends = new Date(activeUntil)
  const dateLabel = ends.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

  if (status === 'active') {
    return {
      banner: {
        title: 'Subscription active',
        body: `Next renewal on ${dateLabel}. Cancel any time — you'll keep access until then.`,
        tint: 'success',
      },
    }
  }
  if (status === 'cancelled') {
    return {
      banner: {
        title: 'Subscription cancelled',
        body: `You'll keep your current plan until ${dateLabel}, then move to Free. Reactivate any time before then.`,
        tint: 'warning',
      },
    }
  }
  if (status === 'past_due') {
    const attemptsLeft = Math.max(0, 3 - retryCount)
    return {
      banner: {
        title: 'Payment failed',
        body: `We couldn't charge your card. We'll retry ${attemptsLeft} more time${attemptsLeft === 1 ? '' : 's'}; after that your plan drops to Free. Update your details to keep your features.`,
        tint: 'danger',
      },
    }
  }
  return { banner: null }
}

/**
 * One plan card. `current` highlights the user's effective tier with a
 * "Current plan" badge. CTA stub: a mailto: link until a real payment
 * provider lands — keeps the upgrade path honest without faking a flow.
 */
function PlanCard({
  name, subtitle, price, features, highlight, current, cta,
}: {
  name: string
  subtitle: string
  price: string
  features: string[]
  highlight?: boolean
  current?: boolean
  cta?: string
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${highlight ? 'rgba(0, 200, 150, 0.45)' : 'var(--card-border)'}`,
        boxShadow: highlight ? '0 0 0 1px rgba(0, 200, 150, 0.20) inset' : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="font-bold text-lg" style={{ color: 'var(--foreground)' }}>{name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-dim)' }}>{subtitle}</p>
        </div>
        {current && (
          <span className="pill pill-green text-[10px] py-0">Current plan</span>
        )}
      </div>
      <p className="font-bold text-2xl mt-3" style={{ color: 'var(--foreground)' }}>{price}</p>
      <ul className="flex flex-col gap-2 my-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--muted)' }}>
            <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#00C896' }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {cta && !current && (
        // Stubbed upgrade — until a payment provider is wired in, the CTA
        // routes to a mailto: link so the user can reach out and get
        // manually upgraded. The CheckoutButton wrapper fires a
        // `checkout_started` analytics event so we can measure conversion
        // from "saw paywall" → "actually reached out".
        <CheckoutButton
          plan={name.toLowerCase() === 'pro' ? 'pro' : name.toLowerCase() === 'business' ? 'business' : 'pro'}
          label={cta}
          mailto={`mailto:hello@stoki.app?subject=${encodeURIComponent(`Upgrade to ${name}`)}&body=${encodeURIComponent(`Hi Stoki team,\n\nI'd like to upgrade to the ${name} plan. Please get back to me with payment details.\n\nThanks!`)}`}
        />
      )}
    </div>
  )
}
