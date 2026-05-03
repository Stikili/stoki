import { ReactElement, cloneElement } from 'react'

// lucide-react icon props subset that we override on every clone.
interface IconProps { size?: number; color?: string; strokeWidth?: number }

/**
 * Tinted icon container — the building block for elegant, world-class
 * iconography across the app. Linear / Stripe / Notion all use a similar
 * pattern: a small rounded-squircle background tinted by category colour,
 * with the icon stroke inheriting that colour at full saturation. This
 * gives icons identity beyond a generic gray and makes scanning a tile grid
 * feel like browsing a curated set, not a stack of glyphs.
 *
 * `tone` maps to a category palette:
 *   - brand    money in / revenue / win                → emerald
 *   - blue     analysis / reports / data
 *   - violet   people / customers / team
 *   - amber    expenses / cost / outflow
 *   - cyan     stock / inventory / supply chain
 *   - rose     credit / debt / overdue
 *   - slate    neutral / settings / chrome
 *
 * The tints are deliberately low-saturation — strong enough to read at a
 * glance, soft enough that an 11-tile dashboard doesn't feel like a Skittles
 * advert. Stroke weight is fixed at 1.5 (lucide's default is 2) for the
 * thinner, more refined feel of premium iconography.
 */

export type IconTone = 'brand' | 'blue' | 'violet' | 'amber' | 'cyan' | 'rose' | 'slate'

interface ToneStyle {
  bg: string
  border: string
  fg: string
}

const PALETTE: Record<IconTone, ToneStyle> = {
  brand:  { bg: 'rgba(0, 200, 150, 0.10)',  border: 'rgba(0, 200, 150, 0.18)',  fg: '#34D5A8' },
  blue:   { bg: 'rgba(96, 165, 250, 0.10)', border: 'rgba(96, 165, 250, 0.18)', fg: '#7AB7FB' },
  violet: { bg: 'rgba(167, 139, 250, 0.10)', border: 'rgba(167, 139, 250, 0.18)', fg: '#B79DFC' },
  amber:  { bg: 'rgba(245, 158, 11, 0.10)',  border: 'rgba(245, 158, 11, 0.20)',  fg: '#F4B860' },
  cyan:   { bg: 'rgba(34, 211, 238, 0.10)',  border: 'rgba(34, 211, 238, 0.18)',  fg: '#5BD9EE' },
  rose:   { bg: 'rgba(244, 114, 182, 0.10)', border: 'rgba(244, 114, 182, 0.20)', fg: '#F58FC4' },
  slate:  { bg: 'rgba(123, 140, 161, 0.10)', border: 'rgba(123, 140, 161, 0.20)', fg: '#9DB0C5' },
}

const SIZES = {
  sm: { container: 28, icon: 14 },
  md: { container: 36, icon: 18 },
  lg: { container: 44, icon: 22 },
  xl: { container: 64, icon: 28 },
} as const

export type IconSize = keyof typeof SIZES

/**
 * Wraps a lucide icon in a tinted squircle. The icon's `color` and
 * `strokeWidth` are overridden so callers don't need to remember to set them.
 */
export default function IconBadge({
  icon,
  tone = 'slate',
  size = 'md',
  className,
}: {
  // Accept any ReactElement; we narrow to lucide's prop shape inside via cast.
  // This avoids forcing every caller to type their <Icon /> as ReactElement<IconProps>.
  icon: ReactElement
  tone?: IconTone
  size?: IconSize
  className?: string
}) {
  const palette = PALETTE[tone]
  const dim = SIZES[size]

  const themed = cloneElement(icon as ReactElement<IconProps>, {
    size: dim.icon,
    color: palette.fg,
    strokeWidth: 1.5,
  })

  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-xl ${className ?? ''}`}
      style={{
        width: dim.container,
        height: dim.container,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      {themed}
    </span>
  )
}
