import { AlertTriangle } from 'lucide-react'

/**
 * Standardised SARS-output disclaimer. Used anywhere the app shows a
 * tax-adjacent number an owner might believe and act on (VAT201, provisional
 * tax, payroll, depreciation). One source of truth for the copy so the
 * caveat is consistent and visually identifiable.
 *
 * `tone` defaults to a quiet amber inline. Pass tone="urgent" for the
 * stale-tax-year warning where we want louder visibility.
 */
export default function SarsDisclaimer({
  tone = 'inline',
  children,
}: {
  tone?: 'inline' | 'urgent'
  children?: React.ReactNode
}) {
  if (tone === 'urgent') {
    return (
      <div
        className="rounded-xl p-3 inline-flex items-start gap-2 w-full"
        style={{
          background: 'rgba(245, 158, 11, 0.10)',
          border: '1px solid rgba(245, 158, 11, 0.30)',
        }}
      >
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" color="#F59E0B" />
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--foreground)' }}>
          {children ?? 'Working estimate only — verify against SARS before submission.'}
        </p>
      </div>
    )
  }

  return (
    <p className="text-muted text-[11px] leading-relaxed mt-2">
      {children ?? 'Working estimate only — verify against SARS before submission.'}
    </p>
  )
}
