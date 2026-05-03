import Link from 'next/link'
import { ArrowDown } from 'lucide-react'
import { ReactElement } from 'react'
import IconBadge, { type IconTone } from '@/components/IconBadge'

/**
 * Friendly empty-state for list pages — explains what the page is for and
 * points the user at the action that fills it. Mounts where the empty list
 * would otherwise render, so it replaces a "No items yet" placeholder with
 * a proper coaching surface.
 *
 * Pattern:
 *   - IconBadge (the page's own primary noun, in a category-tinted squircle)
 *   - One-line headline ("No customers yet")
 *   - One-sentence description (what this page does)
 *   - Either a CTA link (when the action lives on another page) OR an arrow
 *     pointing the user at the in-page action button.
 */
export default function EmptyState({
  icon,
  tone = 'slate',
  title,
  description,
  ctaLabel,
  ctaHref,
  pointToAction = false,
}: {
  icon: ReactElement
  tone?: IconTone
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
      <IconBadge icon={icon} tone={tone} size="xl" className="mb-4" />
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
          <ArrowDown size={16} color="#00C896" strokeWidth={1.5} className="animate-bounce" />
        </div>
      )}
    </div>
  )
}
