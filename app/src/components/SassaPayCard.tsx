import { Wallet } from 'lucide-react'
import { SassaPayEvent, daysUntil, formatGrantList } from '@/lib/sassa'

/**
 * Compact dashboard card surfacing the next SASSA pay date when it's
 * within 7 days. SMME shops near pay-points see 30-50% revenue spikes
 * on these days — surfacing the date helps owners stock up in time.
 *
 * Returns null when no event qualifies, so the dashboard can render this
 * unconditionally and just get nothing when there's no signal.
 */
export default function SassaPayCard({
  event,
  now = new Date(),
}: {
  event: SassaPayEvent | null
  now?: Date
}) {
  if (!event) return null
  const days = daysUntil(event, now)
  if (days < 0 || days > 7) return null

  const grantText = formatGrantList(event.grants)
  const dateLabel = new Date(`${event.date}T00:00:00`).toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

  const heading = days === 0 ? 'SASSA paying today' : days === 1 ? 'SASSA pays tomorrow' : `SASSA pays in ${days} days`

  return (
    <div
      className="card p-4 flex items-start gap-3"
      style={{ borderColor: 'rgba(0,200,150,0.25)' }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,200,150,0.12)' }}>
        <Wallet size={18} color="#00C896" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{heading}</p>
        <p className="text-muted text-xs mt-0.5">
          {grantText} · {dateLabel}
        </p>
        <p className="text-muted text-[10px] mt-1">
          Grant days lift footfall — stock up on staples and airtime.
        </p>
      </div>
    </div>
  )
}
