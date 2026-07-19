import Link from 'next/link'
import { ArrowLeft, Check, Lock, Sparkles } from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import { effectivePlan, trialDaysRemaining, isTrialActive, TRIAL_DAYS } from '@/lib/effective-plan'
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
  const trialDays = isTrialActive(store) ? trialDaysRemaining(store) : 0
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
            <p className="font-bold" style={{ color: 'var(--foreground)' }}>
              {planLabel(current)}
              {trialDays > 0 && <span className="ml-2 pill pill-green text-[10px] py-0">Trial</span>}
            </p>
            {trialDays > 0 ? (
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                You have <span style={{ color: '#00C896', fontWeight: 600 }}>{trialDays} day{trialDays === 1 ? '' : 's'}</span> left on your free {TRIAL_DAYS}-day Business trial{store.plan === 'free' ? ' — your account drops to Free after that unless you pick a plan' : ''}.
              </p>
            ) : (
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {current === 'free'
                  ? 'Upgrade to unlock B2B invoicing, payables, bank reconciliation, and unlimited AI advisor.'
                  : current === 'pro'
                    ? 'Pro active — B2B invoicing, payables, bank reconciliation, unlimited advisor.'
                    : 'Business active — payroll, fixed assets, multi-store, WhatsApp broadcasts.'}
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
          name="Free" subtitle="for your day-one small business" price="R0" priceSub="Forever"
          current={current === 'free' && !trialDays}
          features={[
            '1 store, 1 user',
            'Unlimited products & sales',
            'Credit book + WhatsApp reminders',
            'Cash up, stocktake, prices, airtime, expenses',
            '20 AI advisor questions / day',
            'All auto-pushed alerts (low stock, expiry, dead stock, weather, fuel day…)',
            'Weekly reports',
          ]}
        />
        <PlanCard
          name="Pro" subtitle="going formal — SARS, B2B customers" price="R99 / month" priceSub="or R990/year — 2 months free"
          highlight current={current === 'pro'}
          features={[
            'Everything in Free',
            '2 team members (owner + cashier or manager)',
            'B2B invoicing (SARS tax invoices)',
            'B2B customer book with payment terms',
            'Supplier payables + aging',
            'Purchase orders',
            'Bank reconciliation (FNB / Standard / ABSA / Nedbank / Capitec CSVs)',
            'Unlimited AI advisor + 7 Pro insights unlocked',
            'Provisional tax estimator + cashflow forecast',
            'Accounting exports (Xero / Sage)',
          ]}
          cta="Request Pro access"
        />
        <PlanCard
          name="Business" subtitle="growing — with employees or multiple locations" price="R249 / month" priceSub="or R2,490/year — 2 months free"
          current={current === 'business'}
          features={[
            'Everything in Pro',
            'Payroll — PAYE / UIF / SDL + EMP201 export',
            'Fixed asset register + monthly depreciation',
            'WhatsApp broadcasts (Meta-templated marketing)',
            'Up to 3 stores with cross-store reports',
            'Up to 5 team members',
            'Priority WhatsApp support (4-hour response, business hours)',
          ]}
          cta="Request Business access"
        />
        <PlanCard
          name="Enterprise" subtitle="chains, franchises, 10+ locations" price="From R899 / month" priceSub="Contact sales"
          current={current === 'enterprise'}
          features={[
            'Everything in Business',
            'Unlimited stores + team members',
            'Dedicated account manager',
            'Custom onboarding + training for your team',
            'SLA-backed uptime (99.5% target)',
            'Priority feature requests',
          ]}
          cta="Talk to us"
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
            Seven AI advisor insights only Pro users get. Tap each to see what it does for your business.
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
        Need a custom plan for multiple branches, white-label, or SSO? Email <a href="mailto:support@stokiapp.com" className="underline" style={{ color: 'var(--muted)' }}>support@stokiapp.com</a>.
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
  name, subtitle, price, priceSub, features, highlight, current, cta,
}: {
  name: string
  subtitle: string
  price: string
  priceSub?: string
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
      {priceSub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-dim)' }}>{priceSub}</p>}
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
          mailto={`mailto:support@stokiapp.com?subject=${encodeURIComponent(`Upgrade to ${name}`)}&body=${encodeURIComponent(`Hi Stoki team,\n\nI'd like to upgrade to the ${name} plan. Please get back to me with payment details.\n\nThanks!`)}`}
        />
      )}
    </div>
  )
}
