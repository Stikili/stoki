import Link from 'next/link'
import { ArrowDown } from 'lucide-react'
import { ReactNode } from 'react'

/**
 * Friendly empty-state for list pages — explains what the page is for and
 * points the user at the action that fills it. Mounts where the empty list
 * would otherwise render, so it replaces a "No items yet" placeholder with
 * a proper coaching surface.
 *
 * Pattern:
 *   - Icon (the page's own primary noun)
 *   - One-line headline ("No customers yet")
 *   - One-sentence description (what this page does)
 *   - Either a CTA link (when the action lives on another page) OR an arrow
 *     pointing the user at the in-page action button.
 */
export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  pointToAction = false,
}: {
  icon: ReactNode
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
  /** Render an "↓ tap +" hint instead of a CTA link, for pages whose action
   *  is a + button on the same page. */
  pointToAction?: boolean
}) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}
      >
        {icon}
      </div>
      <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>{title}</p>
      <p className="text-sm text-muted max-w-xs leading-relaxed">{description}</p>

      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="btn-primary mt-5 inline-flex items-center justify-center"
          style={{ width: 'auto', padding: '12px 20px' }}
        >
          {ctaLabel}
        </Link>
      )}

      {pointToAction && (
        <div className="mt-5 flex flex-col items-center gap-1.5">
          <p className="text-xs text-muted">Tap the + button to start</p>
          <ArrowDown size={16} color="#00C896" className="animate-bounce" />
        </div>
      )}
    </div>
  )
}
