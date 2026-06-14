import Link from 'next/link'
import { Receipt } from 'lucide-react'
import type { ProvisionalEstimate } from '@/lib/tax/provisional'
import type { TaxpayerType } from '@/domain/entities/store'

/**
 * Dashboard card: "You owe SARS approx R X based on YTD profit."
 *
 * Surfaces the *next* provisional payment only — the full-year estimate sits
 * behind the chevron for owners who want to drill in. Hidden when ytdProfit
 * lands at zero or below (no useful estimate to make).
 */
export default function ProvisionalTaxCard({
  estimate,
  taxpayerType,
}: {
  estimate: ProvisionalEstimate
  taxpayerType: TaxpayerType
}) {
  if (estimate.ytdProfit <= 0 || estimate.estimatedAnnualTax <= 0) return null

  const deadline = estimate.nextDeadline.toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const periodLabel = estimate.nextPeriod === 1
    ? '1st provisional (50%)'
    : '2nd provisional (balancing)'

  return (
    <Link
      href="/reports"
      className="card p-5 block"
      style={{ borderColor: 'rgba(245, 158, 11, 0.18)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Receipt size={14} strokeWidth={1.7} color="#F59E0B" />
        <p className="text-muted text-xs font-semibold uppercase tracking-widest">
          Provisional Tax
        </p>
      </div>

      <p className="text-[32px] font-bold leading-none" style={{ color: '#F59E0B' }}>
        R{estimate.nextPaymentAmount.toFixed(0)}
      </p>

      <p className="text-muted text-sm mt-2">
        {periodLabel} due {deadline}
      </p>

      <div className="flex flex-col gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">YTD profit</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            R{estimate.ytdProfit.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Projected annual tax</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            R{estimate.estimatedAnnualTax.toFixed(0)}
          </span>
        </div>
        <p className="text-muted text-[11px] mt-2 leading-relaxed">
          Annualised straight-line from {estimate.daysIntoYear} days of trading,
          taxed under {labelFor(taxpayerType)}. Verify against SARS before
          submitting — actual payment may vary with seasonality.
        </p>
      </div>
    </Link>
  )
}

function labelFor(type: TaxpayerType): string {
  switch (type) {
    case 'sole_prop':    return 'sole proprietor rates'
    case 'sbc':          return 'Small Business Corporation rates'
    case 'turnover_tax': return 'turnover tax'
    case 'company':      return 'company tax (27%)'
  }
}
