interface LogoProps {
  size?: number
  color?: string
  /** Reserved for API parity with lucide-react icons; the mark is filled, not stroked. */
  strokeWidth?: number
  className?: string
}

/**
 * Stoki mark — three stacked rounded blocks offset to suggest an "S" silhouette.
 *
 *     ▰▰▰▰▰        top    (right-aligned)
 *  ▰▰▰▰▰           middle (left-aligned, slightly darker for depth)
 *     ▰▰▰▰▰        bottom (right-aligned)
 *
 * The stack reads as inventory at a glance, the offsets sketch out an "S" at
 * a distance, and the silhouette stays legible from a 16px favicon up to a
 * 512px PWA splash. Filled rather than stroked so the smallest sizes don't
 * crush — every viewer-friendly logo of this generation (Linear, Vercel,
 * Stripe, Notion) is fill-first.
 */
export default function Logo({
  size = 24,
  color = '#00C896',
  className,
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Stoki"
    >
      {/* Top block — right-aligned */}
      <rect x="20" y="10" width="32" height="12" rx="3" fill={color} />
      {/* Middle block — left-aligned, dimmed to suggest depth/recession */}
      <rect x="12" y="26" width="32" height="12" rx="3" fill={color} opacity="0.78" />
      {/* Bottom block — right-aligned, mirroring the top */}
      <rect x="20" y="42" width="32" height="12" rx="3" fill={color} />
    </svg>
  )
}
